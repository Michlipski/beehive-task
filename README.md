# beehive-task

## Server

The server is built based on go version 1.20.
Non boiler-plate code for the server can be found in `beehive-server/server/server.go`.

The server can be run locally from `beehive-server/` with the following:
1. `go mod download`
2. `go run server/server.go`

### Next steps

As this is intended to be a simple task, some simplification has occurred.

To simplify routing, everything is done through websockets via a single endpoint, /ws. Ideally this would be broken into some form of auth endpoint and the ws endpoint. /auth would provide the user with a token that could be sent as an Authorization header with the websocket connection request.

Messages currently consist of just the message and whether it's the user's own message. This would ideally contain better metadata, examples including a username and timestamp. Among other UX improvements out of scope for this exercise, providing a timestamp would also allow for the server to paginate the initial message history payload as the frontend could be relied upon the verify ordering, and the username would remove the need for an isMe field.

Unit tests!


## Client

The client is based on node version 18.
Non boiler-plate code for the frontend can be found in `beehive-frontend/src/pages.tsx`.

The client can be run locally by following these steps from `beehive-frontend/`:

1. `yarn install`
2. `yarn dev`

### Next steps

The UI was also kept simple, here are a couple examples of areas for improvement beyond general styling improvements:
- With the addition of usernames and timestamps additional context for each message could be provided to improve UX.
- User interaction could be more satisfying and confirmational e.g. by showing sent messages in the chat in a loading state before they are processed by the server
