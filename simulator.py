import time
import queue
import numpy as np
import random
from datetime import datetime
from customer import customer
import scheduler

def addtoidx(A, add):
    idx = np.where(A==add)[0][0]
    return idx

def pathtime(add, curr, Atime):
    Ptime = 0
    if curr != add: # next address != current address
        if curr == -1:
            Ptime = np.sum(Atime[:add+1])
        else:
            if curr < add:
                Ptime = np.sum(Atime[curr:add+1])
            else:
                Ptime = np.sum(Atime[curr:]) + np.sum(Atime[:add+1])
    return Ptime

'''def Dtime(Dlist, Mtime, Atime, Alist): # total delivery time
    curr = -1 # current spot = stop
    Ptime = 0 # 주행시간(?)
    c = 0
    for cust in Dlist:
        add = addtoidx(Alist, cust._address)
        Ptime += pathtime(add, curr, Atime)
        curr = add
        c += 1
        if c == maxitem: # reload the cart
            c = 0
            curr = -1
            Ptime += np.sum(Atime[add:])
    # simplest case: load/unload time per item + Ptime
    Dtime = Mtime*len(Dlist)*2 + Ptime
    return Dtime'''

def TperOrder(Dlist, Mtime, Atime, Address, maxitem):
    timelist = []
    Dtime = 0
    curr = -1 # stop
    for i in range(len(Dlist)):
        cust = Dlist[i]
        add = addtoidx(Address, cust._address)
        if i != 0 and cust._ID != Dlist[i-1]._ID:
            timelist.append(Dtime)
            print("Delivery time of order ID {}: {}".format(Dlist[i-1]._ID, Dtime))
            Dtime = 0
        if add != curr:
            if cust._N > maxitem:
                cycle = int(cust._N/maxitem) - 1
                #add = addtoidx(Address, cust._address)
                Dtime += pathtime(add, curr, Atime) + cycle * np.sum(Atime) + Mtime[0] * cust._N + Mtime[1]
                # sum of robot driving + total load time + unload time for one item
                curr = add
            else:
                #add = addtoidx(Address, cust._address)
                Dtime += pathtime(add, curr, Atime) + Mtime[0] * cust._N + Mtime[1]
                curr = add
        else:
            Dtime += Mtime[1] # unload an item
    print("Delivery time of order ID {}: {}".format(Dlist[i-1]._ID, Dtime))
    return timelist

class orders:
    red = 0
    green = 0
    blue = 0
    ordertime = None
    filltime = None

    def __init__(self, ID, address):
        self.ID = ID
        self.address = address
        self.red = random.randint(0,5)
        self.green = random.randint(0,5)
        self.blue = random.randint(0,5)
        self.ordertime = datetime.now()


a = [101,102,103,203,202,201] # address list
Address = np.asarray(a)

# 시간 정하기
Mtime = [2, 2, 10]
# Mtime = [load, unload, battery change] -> load/unload per item
Atime = [1, 2, 2, 3, 2, 2, 1] # interval between addresses
Atime = np.asarray(Atime)
'''time_0 = stop - 101
time_1 = 101 - 102
time_2 = 102 - 103
time_3 = 103 - 203
time_4 = 203 - 202
time_5 = 202 - 201
time_6 = 201 - stop'''

maxitem = 20 # cart capacity
order_count = 3
Q = queue.Queue()
Q2 = queue.Queue()
random.shuffle(a)

CUST1 = customer(1, a[0], order_count, 30)
#CUST1.startTIMER(Q)
CUST1.makeRGB()
Q.put(CUST1)

CUST2 = customer(2, a[1], order_count, 30)
#CUST2.startTIMER(Q)
CUST2.makeRGB()
Q.put(CUST2)

CUST3 = customer(3, a[2], order_count, 30)
#CUST3.startTIMER(Q)
CUST3.makeRGB()
Q.put(CUST3)

CUST4 = customer(4, a[3], order_count, 30)
#CUST4.startTIMER(Q)
CUST4.makeRGB()
Q.put(CUST4)

CUST5 = customer(5, a[4], order_count, 30)
#CUST5.startTIMER(Q)
CUST5.makeRGB()
Q.put(CUST5)

CUST6 = customer(6, a[5], order_count, 30)
#CUST6.startTIMER(Q)
CUST6.makeRGB()
Q.put(CUST6)

Q2.put(CUST1)
Q2.put(CUST2)
Q2.put(CUST3)
Q2.put(CUST4)
Q2.put(CUST5)
Q2.put(CUST6)


# scheduling algorithm 대로 실험?
Dlist = []
Dlist = scheduler.FIFO(Q, Dlist)
Dlist2 = []
Dlist2 = scheduler.smallorder(Q2, Dlist2)


timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
#print("Deliver time: {}".format(Dtime))
avgtime = sum(timelist)/len(timelist)
print("Avg Deliver time: {}".format(avgtime))

timelist2 = TperOrder(Dlist2, Mtime, Atime, Address, maxitem)
#print("Deliver time: {}".format(Dtime))
avgtime = sum(timelist2)/len(timelist2)
print("Avg Deliver time: {}".format(avgtime))
