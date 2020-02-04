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

def backpath(add, curr, Atime): # back = 1
    Ptime = 0
    if curr != add:
        if curr == -1:
            Ptime = Atime[6]
        elif curr == 0: # 201 to stop
            if add != 5:
                Ptime = Atime[0] + pathtime(add, -1, Atime)
            else: # 201- stop - 101
                Ptime = Atime[0] + Atime[6]
        else: # add == 5: # stop to 101
            Ptime = Atime[6] + pathtime(add, -1, Atime)
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

def TperOrdernew(Dlist, Mtime, Atime, Address, maxitem): # Dlist = [order, back]
    timelist = []
    Dtime = 0
    curr = -1 # stop
    for i in range(len(Dlist)):
        cust = Dlist[i][0]
        back = Dlist[i][1]
        add = addtoidx(Address, cust._address)
        if i != 0 and cust._ID != Dlist[i-1][0]._ID:
            timelist.append(Dtime)
            print("Delivery time of order ID {}: {}".format(Dlist[i-1][0]._ID, Dtime))
            #Dtime = 0
        if add != curr:
            if cust._N > maxitem:
                cycle = int(cust._N/maxitem) - 1
                #add = addtoidx(Address, cust._address)
                if back == 1:
                    Dtime += backpath(add, curr, Atime) + cycle * np.sum(Atime) + Mtime[0] * cust._N + Mtime[1]
                else:
                    Dtime += pathtime(add, curr, Atime) + cycle * np.sum(Atime) + Mtime[0] * cust._N + Mtime[1]
                # sum of robot driving + total load time + unload time for one item
                curr = add
            else:
                #add = addtoidx(Address, cust._address)
                if back == 1:
                    Dtime += backpath(add, curr, Atime) + Mtime[0] * cust._N + Mtime[1]
                else:
                    Dtime += pathtime(add, curr, Atime) + Mtime[0] * cust._N + Mtime[1]
                curr = add
        else:
            Dtime += Mtime[1] # unload an item
    timelist.append(Dtime)
    print("Delivery time of order ID {}: {}".format(Dlist[i][0]._ID, Dtime))
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

def testsmall(Q, orderlist):
    print("-------sorted by quantity-------")
    Dlist, orderlist = scheduler.smallorder(Q, orderlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist)/len(timelist)
    #avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))
    return orderlist

def testSmallAdd(Dlist, Q):
    print("-------sorted by quantity & address-------")
    Dlist = scheduler.SmallandAdd(Q, Dlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist)/len(timelist)
    #avgtime = timelist[-1] / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))

def testnew(Q, maxitem, orderlist):
    print("-------sorted by quantity & address & update-------")
    Dlist, orderlist = scheduler.updatescedule(Q, maxitem, orderlist)
    timelist = TperOrder(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist) / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))
    return orderlist

def testback(Q, maxitem, orderlist):
    print("-------sorted by quantity & address & update & backward-------")
    Dlist, orderlist = scheduler.BackSimple(Q, maxitem, orderlist)
    timelist = TperOrdernew(Dlist, Mtime, Atime, Address, maxitem)
    avgtime = sum(timelist) / len(timelist)
    print("Avg Deliver time: {}".format(avgtime))
    return orderlist

def generator(CUST, seed, x, Q, Q2, Q3):
    for i in range(len(seed)):
    #for x in range(15):
        random.seed(seed[i])
        idx = random.randint(0, 5)
        CUST[x] = customer(x + 1, a[idx], order_count, maxN)  # ID = x+1, address = a[idx]
        CUST[x].makeRGB(seed[i])
        Q.put(CUST[x])
        Q2.put(CUST[x])
        Q3.put(CUST[x])
        x += 1


a = [201,202,203,103,102,101] # address list
Address = np.asarray(a)

# 시간 정하기
Mtime = [2, 2, 10]
# Mtime = [load, unload, battery change] -> load/unload per item
Atime = [1.5, 2, 2, 3, 2, 2, 1.5] # interval between addresses
Atime = np.asarray(Atime)
'''time_0 = stop - 201
time_1 = 201 - 202
time_2 = 202 - 203
time_3 = 203 - 103
time_4 = 103 - 102
time_5 = 102 - 101
time_6 = 101 - stop'''

maxitem = 20 # cart capacity
order_count = 1
Q = queue.Queue()
Q2 = queue.Queue()
Q3 = queue.Queue()
Q4 = queue.Queue()
seed = np.arange(100)
maxN = 30
CUST = np.zeros(100).tolist()
Dlist = []
Dlist2 = []
Dlist3 = []
Dlist4 = []

'''for i in range(len(seed)):
#for i in range(10):
    random.seed(seed[i])
    idx = random.randint(0,5)

    CUST[i] = customer(i+1, a[idx], order_count, maxN) # ID = i+1, address = a[idx]
    CUST[i].makeRGB(seed[i])
    Q.put(CUST[i])
    Q2.put(CUST[i])
    Q3.put(CUST[i])
    Q4.put(CUST[i])'''

'''testFIFO(Dlist, Q)
testsmall(Dlist2, Q2)
testSmallAdd(Dlist3, Q3)'''
orderlist = []
orderlist2 = []
orderlist3 = []
for i in range(10):
    generator(CUST, seed[i*10:(i+1)*10], i*10, Q, Q2, Q3)
    orderlist = testsmall(Q, orderlist)
    orderlist2 = testnew(Q2, maxitem, orderlist2)
    orderlist3 = testback(Q3, maxitem, orderlist3)
#generator(CUST, seed, Q, 0)
#orderlist = testnew(Q, Dlist5, maxitem, orderlist)

