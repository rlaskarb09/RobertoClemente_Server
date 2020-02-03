import time
import queue
import numpy as np
import random
from datetime import datetime
from customer import customer
import scheduler
import threading

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
            #Dtime = 0
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
    timelist.append(Dtime)
    print("Delivery time of order ID {}: {}".format(Dlist[i]._ID, Dtime))
    return timelist

'''class orders:
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
        self.ordertime = datetime.now()'''

def testFIFO(Dlist, Q):
    print("-------FIFO-------")
    Dlist = scheduler.FIFO(Q, Dlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist)/len(timelist)
    #avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))

def testsmall(Dlist, Q):
    print("-------sorted by quantity-------")
    Dlist = scheduler.smallorder(Q, Dlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist)/len(timelist)
    #avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))

def testSmallAdd(Dlist, Q):
    print("-------sorted by quantity & address-------")
    Dlist = scheduler.SmallandAdd(Q, Dlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist)/len(timelist)
    #avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))

def testSmallandAdd2(Q, Dlist, maxitem):
    print("-------sorted by quantity & address ver2-------")
    Dlist = scheduler.SmallandAdd2(Q, Dlist, maxitem)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist) / len(timelist)
    # avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))

def testnew(Q, Dlist, maxitem, orderlist):
    print("-------sorted by quantity & address & update-------")
    Dlist, orderlist = scheduler.updatescedule(Q, maxitem, orderlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist) / len(timelist)
    # avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))
    return orderlist

def generator(CUST, seed, Q, x):
    for i in range(len(seed)):
    #for x in range(15):
        random.seed(seed[i])
        idx = random.randint(0, 5)
        CUST[x] = customer(x + 1, a[idx], order_count, maxN)  # ID = x+1, address = a[idx]
        CUST[x].makeRGB(seed[i])
        Q.put(CUST[x])
        x += 1


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
order_count = 1
Q = queue.Queue()
Q2 = queue.Queue()
Q3 = queue.Queue()
Q4 = queue.Queue()
Q5 = queue.Queue()
seed = np.arange(100)
maxN = 30
CUST = np.zeros(100).tolist()
Dlist = []
Dlist2 = []
Dlist3 = []
Dlist4 = []
Dlist5 = []

'''for i in range(len(seed)):
#for i in range(10):
    random.seed(seed[i])
    idx = random.randint(0,5)

    CUST[i] = customer(i+1, a[idx], order_count, maxN) # ID = i+1, address = a[idx]
    CUST[i].makeRGB(seed[i])
    Q.put(CUST[i])
    Q2.put(CUST[i])
    Q3.put(CUST[i])
    Q4.put(CUST[i])
    Q5.put(CUST[i])'''

'''testFIFO(Dlist, Q)
testsmall(Dlist2, Q2)
testSmallAdd(Dlist3, Q3)
testSmallandAdd2(Q4, Dlist4, maxitem)'''
orderlist = []
for i in range(10):
    generator(CUST, seed[i*10:(i+1)*10], Q, i*10)
    orderlist = testnew(Q, Dlist5, maxitem, orderlist)

#generator(CUST, seed, Q, 0)
#orderlist = testnew(Q, Dlist5, maxitem, orderlist)

