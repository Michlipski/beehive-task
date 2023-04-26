import React, { useEffect, useRef, useState } from 'react';
import { Inter } from 'next/font/google';
import useWebSocket from 'react-use-websocket';

const inter = Inter({ subsets: ['latin'] });

interface Message {
  id: string;
  value: string;
  isMe?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unsentMessage, setUnsentMessage] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const chatBottomRef = useRef<HTMLTableRowElement | null>(null);

  const { sendMessage, lastMessage, readyState } = useWebSocket('ws://localhost:8080/ws');

  useEffect(() => {
    if (!lastMessage) return;
    try {
      const parsedMessage = JSON.parse(lastMessage.data);
      if (parsedMessage.isAuthed) setLoggedIn(true);

      switch(parsedMessage.messageType) {
        case 'messageHistory':
          setMessages(parsedMessage.value);
          setError('');
          break;
        case 'newMessage':
          if (messages.find(({ id }) => id === parsedMessage?.value?.id)) break;
          setMessages([...messages, {...parsedMessage.value, isMe: parsedMessage.isMe}]);
        case 'auth':
          if (!parsedMessage.isAuthed && parsedMessage.value) {
            setError(parsedMessage.value);
          }
        default:
          break;
      }
    } catch (e) {
      setError(JSON.stringify(e));
    }
  }, [lastMessage]);

  const handleLogin = async () => {
    sendMessage(`password:${password}`);
  };

  const handleSendMessage = () => {
    sendMessage(unsentMessage);
    setUnsentMessage('');
  };

  const handleMessageKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === 'Enter') handleSendMessage();
  };

  const handlePasswordKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === 'Enter') handleLogin();
  };

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView();
    }
  });

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center p-24 ${inter.className}`}
    >
      <div className='w-96 text-center border-solid border-gray-300 border-2 p-2'>
        <div className='text-lg grow-0'>Welcome to the chat</div>
        <div className="h-80 max-h-80 flex flex-col text-center">
          {!loggedIn && (
            <>
              <div className='text-md grow-0'>Enter the password to enter</div>
              <div className='grow' />

              <div className='flex mt-2'>
                <input
                  className='grow px-2 overflow-hidden'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeydown}
                  placeholder='Try ham'
                />
                <button
                  className="ml-4 grow-0 shrink-0 p-2 border-2 rounded-full"
                  onClick={handleLogin}
                >
                  Submit Password
                </button>
              </div>
            </>
          )}
          {loggedIn && (
            <>
              <div className='overflow-auto'>
                <table className='w-full'>
                  <tbody>
                    {messages.map(({ id, value, isMe }) => (
                      <tr key={id}>
                        <td align={isMe ? 'right' : 'left'} className='px-1'>
                          {value}
                        </td>
                      </tr>
                    ))}
                    <tr ref={chatBottomRef} className='max-h-0'></tr>
                  </tbody>
                </table>
              </div>
              <div className='flex mt-2'>
                <input
                  className='grow px-2 overflow-hidden'
                  value={unsentMessage}
                  onChange={(e) => setUnsentMessage(e.target.value)}
                  onKeyDown={handleMessageKeydown}
                  placeholder='Enter a message to send'
                />
                <button
                  className='ml-4 rounded-full border-2 p-2 shrink-0'
                  onClick={handleSendMessage}
                >
                  Send Message
                </button>
              </div>
            </>
          )}
          {error && (
            <p className='text-red-600 text-sm'>{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
