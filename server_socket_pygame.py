import cv2
import struct
import numpy as np
import pygame, time
from pygame.locals import *
from socket import *

# Init pygame display
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
pygame.init()
screen = pygame.display.set_mode((720, 560))
pygame.display.set_caption('Pygame Keyboard Test')
pygame.mouse.set_visible(0)
myfont = pygame.font.SysFont('Comic Sans MS', 20)
screen.fill(BLACK)

# actions
FORWARD = 'FORWARD'
BACK = 'BACK'
LEFT = 'LEFT'
RIGHT = 'RIGHT'
STOP = 'STOP'
NO_ACTION = 'NO_ACTION'
ACTION_LENGTH = 10

# Opens server
serverPort = 8888
serverSocket = socket(AF_INET, SOCK_STREAM)
serverSocket.bind(('', serverPort))
serverSocket.listen(1)

data = b""
payload_size = struct.calcsize(">L")
print("payload_size: {}".format(payload_size))

print("The server is ready to receive on port", serverPort)

def recvall(sock, count):
    buf = b''
    while count:
        newbuf = sock.recv(count)
        if not newbuf: return None
        buf += newbuf
        count -= len(newbuf)
    return buf

def getAction():
    events = pygame.event.get()
    for event in events:
        if event.type == KEYDOWN:
            if event.key == K_UP:
                print("key up")
                return FORWARD
                text = myfont.render('KEY UP', False, WHITE)
                # time.sleep(0.1)
            elif event.key == K_DOWN:
                print("key down")
                return BACK
                text = myfont.render('KEY DOWN', False, WHITE)
                # time.sleep(0.1)
            elif event.key == K_LEFT:
                print("key left")
                return LEFT
                text = myfont.render('KEY LEFT', False, WHITE)
                # time.sleep(0.1)
            elif event.key == K_RIGHT:
                print("key right")
                return RIGHT
                text = myfont.render('KEY RIGHT', False, WHITE)
                # time.sleep(0.1)
            elif event.key == K_s:
                print("key S")
                return STOP
                text = myfont.render('KEY S', False, WHITE)
                # time.sleep(0.1)
    return NO_ACTION

while True:
    # Accepts connection
    (connectionSocket, clientAddress) = serverSocket.accept()
    print('Connection requested from', clientAddress)        
    try:
        while True:
            # Get message
            length = recvall(connectionSocket, 16)
            print('image size:', int(length), 'bytes')
            stringData = recvall(connectionSocket, int(length))
            data = np.fromstring(stringData, dtype='uint8')

            # Sends response
            actionMessage = getAction()
            connectionSocket.send(actionMessage.encode().ljust(ACTION_LENGTH))
            # If action is not NO_ACTION, print the action on the screen
            if actionMessage != NO_ACTION:
                text = myfont.render(actionMessage, False, WHITE)
                screen.fill(BLACK)
                screen.blit(text, (10,1))

            # Shows the image
            # flips around the y-axis
            encodeStart = time.time()
            decodedImage = cv2.imdecode(data,1)
            frame = np.flipud(np.rot90(cv2.cvtColor(decodedImage,cv2.COLOR_BGR2RGB)))
            frame = pygame.surfarray.make_surface(frame)
            encodeEnd = time.time()
            print('encoding time:', encodeEnd - encodeStart)

            # Draw on screen
            screen.blit(frame, (40,40))
            pygame.display.update()
            # time.sleep(0.1)
    except:
        print("Waiting for connection...")
        #return 0


