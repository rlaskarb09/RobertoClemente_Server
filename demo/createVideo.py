# create video from images

import cv2


fourcc = cv2.VideoWriter_fourcc(*'mp4v') # Be sure to use the lower case
out = cv2.VideoWriter('../sterling_demo.mp4', fourcc, 20.0, (480,360), True)

for i in range(604, 1722):
    filename ='../Img_%d.jpg'%i
    img = cv2.imread(filename)
    out.write(img)

out.release()
cv2.destroyAllWindows()
