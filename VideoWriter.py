import cv2
import numpy as np
import glob
import os

imgarray = []
DataFolder = '/Users/soua/Desktop/Project/sterling_demo'

for count in range(len(os.listdir(DataFolder))):
    filename = DataFolder + '/Img_' + str(count) + '.jpg'
    img = cv2.imread(filename)
    H, W, L = img.shape
    size = (W, H)
    imgarray.append(img)

out = cv2.VideoWriter('sterling_demo.mp4', cv2.VideoWriter_fourcc(*'DIVX'), 15, size)

for i in range(len(imgarray)):
    out.write(imgarray[i])
out.release()