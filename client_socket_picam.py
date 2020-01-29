import cv2
import time
import pickle
import numpy as np
from socket import *
from adafruit_servokit import ServoKit
from picamera.array import PiRGBArray
from picamera import PiCamera
# actions
FORWARD = 'FORWARD'
BACK = 'BACK'
LEFT = 'LEFT'
RIGHT = 'RIGHT'
STOP = 'STOP'
NO_ACTION = 'NO_ACTION'
ACTION_LENGTH = 10

kit = ServoKit(channels=16)

# serverName = '172.26.226.69' # 남규
serverName = '172.26.226.86' # 수아
# serverName = '172.26.226.55' # 채화

serverPort = 8888
camera = PiCamera()
camera.resolution = (480,360)
camera.framerate = 30
rawCapture = PiRGBArray(camera, size=(480,360))

# 95 is default
encodeParam = [int(cv2.IMWRITE_JPEG_QUALITY), 70]

def moveForward(kit):
    kit.continuous_servo[0].throttle = 0.5
    kit.continuous_servo[1].throttle = -0.5

def moveBack(kit):
    kit.continuous_servo[0].throttle = -0.5
    kit.continuous_servo[1].throttle = 0.5

def moveLeft(kit):
    kit.continuous_servo[0].throttle = -0.5
    kit.continuous_servo[1].throttle = -0.5

def moveRight(kit):
    kit.continuous_servo[0].throttle = 0.5
    kit.continuous_servo[1].throttle = 0.5

def moveStop(kit):
    kit.continuous_servo[0].throttle = 0
    kit.continuous_servo[1].throttle = 0


clientSocket = socket(AF_INET, SOCK_STREAM)
clientSocket.connect((serverName, serverPort))

print('The client is running on port', clientSocket.getsockname()[1])

while True:
    rawCapture = PiRGBArray(camera, size=(480,360))
    camera.capture(rawCapture, format='bgr', use_video_port=True)
    frame = rawCapture.array
    ret, imgencode = cv2.imencode('.jpg', frame, encodeParam)
    stringData = np.array(imgencode).tostring()
    # send frame
    clientSocket.send(str(len(stringData)).encode().ljust(16))
    clientSocket.send(stringData)

    # decimg = cv2.imdecode(data, 1)
    # cv2.imshow('CLIENT', decimg)
    # cv2.waitKey(0)
    # message = input('Input lowercase sentence: ')
    
    
    actionMessage = clientSocket.recv(ACTION_LENGTH)
    action = actionMessage.decode().strip()
    if action != NO_ACTION:
        print('Reply from server:', action)
    
    if action == FORWARD:
        moveForward(kit)
    elif action == BACK:
        moveBack(kit)
    elif action == LEFT:
        moveLeft(kit)
    elif action == RIGHT:
        moveRight(kit)
    elif action == STOP:
        moveStop(kit)

    # time.sleep(1)
    # clientSocket.close()




