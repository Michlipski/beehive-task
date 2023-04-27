package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Message struct {
	Id    string `json:"id"`
	Value string `json:"value"`
}

var (
	addr = flag.String("addr", ":8080", "http service address")

	// Websocket variables
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// Allow any connections
			return true
		},
	}

	authorizedConn      = make(map[*websocket.Conn]bool)
	authorizedConnMutex sync.Mutex

	// "auth"
	chatroomPassword = "ham"
	passwordPrefix   = "password:"

	// list of messages in the chat
	messages = []Message{{uuid.New().String(), "an existing message"}}
)

func ws(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade connection to WebSocket:", err)
		return
	}
	defer func() {
		// Close the connection and remove it from the connections and authorizedConn maps
		conn.Close()

		authorizedConnMutex.Lock()
		delete(authorizedConn, conn)
		authorizedConnMutex.Unlock()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("Failed to read message from WebSocket:", err)
			break
		}
		log.Println("Received message from WebSocket:", string(message))

		strMessage := string(message)

		if strings.HasPrefix(strMessage, passwordPrefix) {
			data := map[string]interface{}{
				"isAuthed":    false,
				"messageType": "auth",
				"value":       "You are not authorized to access this chat, please try again",
			}
			passwordAttempt, _ := strings.CutPrefix(strMessage, passwordPrefix)
			if passwordAttempt == chatroomPassword {
				// Add the connection to the authorizedConn map
				authorizedConnMutex.Lock()
				authorizedConn[conn] = true
				authorizedConnMutex.Unlock()

				data = map[string]interface{}{
					"isAuthed":    true,
					"messageType": "messageHistory",
					"value":       messages,
				}
			}
			out, err := json.Marshal(data)
			if err != nil {
				log.Println("Failed to marshal websocket data to JSON:", err)
				break
			}
			err = conn.WriteMessage(websocket.TextMessage, out)
			if err != nil {
				log.Println("Failed to write message to WebSocket:", err)
				break
			}
		} else {
			authorizedConnMutex.Lock()
			isAuthorized := authorizedConn[conn]
			authorizedConnMutex.Unlock()

			if !isAuthorized {
				break
			}

			newMessage := Message{uuid.New().String(), strMessage}
			messages = append(messages, newMessage)

			data := map[string]interface{}{
				"isAuthed":    true,
				"isMe":        true,
				"messageType": "newMessage",
				"value":       newMessage,
			}
			meOut, err := json.Marshal(data)
			if err != nil {
				log.Println("Failed to marshal websocket data to JSON:", err)
				break
			}
			data["isMe"] = false
			othersOut, err := json.Marshal(data)
			if err != nil {
				log.Println("Failed to marshal websocket data to JSON:", err)
				break
			}

			authorizedConnMutex.Lock()
			for authedConn := range authorizedConn {
				out := meOut
				if authedConn != conn {
					out = othersOut
				}
				err = authedConn.WriteMessage(websocket.TextMessage, out)
				if err != nil {
					log.Println("Failed to write message to WebSocket:", err)
					// could maybe close the connection and delete from the mutex here
					continue
				}
			}
			authorizedConnMutex.Unlock()
		}
	}
}

func main() {
	flag.Parse()
	log.SetFlags(0)
	r := gin.Default()
	r.SetTrustedProxies([]string{"localhost"})
	r.Use(cors.Default())
	r.GET("/ws", ws)
	log.Fatal(r.Run(*addr))
}
