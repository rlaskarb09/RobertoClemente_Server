import queue
import numpy as np
from customer import customer


def FIFO(Q, Dlist):
    while Q.empty() == False:
        order = Q.get()
        for n in range(order._N):
            Dlist.append(order)
    return Dlist # delivery list

# item 적은순
def smallorder(Q, orderlist):
    Dlist = []
    while Q.empty() == False:
        order = Q.get()
        orderlist.append([order, order._N, order._filldate])
    k = 0
    for (order, _, filldate) in orderlist:
        k += 1
        if filldate != None:
            break
    if k == len(orderlist):
        k = 0
    orderlist = sorted(orderlist[k:], key = lambda x: x[1])
    for (order, n, _) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist, orderlist

# item수 + address
def SmallandAdd(Q, Dlist):
    orderlist = []
    dict = {101: 1, 102: 2, 103: 3, 203: 4, 202: 5, 201: 6} # order._address = key
    curr = -1
    while Q.empty() == False:
        order = Q.get()
        orderlist.append((order, order._N, dict[order._address]))
    # sort by N of items
    orderlist = sorted(orderlist, key=lambda x: x[1])
    orderlist = np.asarray(orderlist)
    # sort by address if N of items is same
    for i in range(orderlist.shape[0]):
        idx = np.where(orderlist[:,1]==orderlist[i,1])[0]
        if idx.shape[0] != 1 and i==idx[0]:
            if i != 0:
                curr = orderlist[i - 1][2]
            sortedidx = distance(orderlist[idx,2], curr)
            orderlist[idx] = orderlist[idx[sortedidx]]
    '''for n in range(orderlist.shape[0]):
        Dlist.append(orderlist[n][0])'''
    for (order, n, _) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist

def distance(adds, curr):
    d = [3, 2, 2, 3, 2, 2] # 201-101-102-103-203-202-201
    size = (adds.shape[0])
    ddd = np.zeros(size)
    for i in range(size):
        dist = 0
        add = adds[i]
        if curr != add: # next address != previous address
            if curr == -1:
                dist = np.sum(d[:add-1])-d[0]/2
            else:
                if curr < add:
                    dist = np.sum(d[curr:add-1])
                else:
                    dist = np.sum(d[curr:]) + np.sum(d[:add-1])
        ddd[i] = dist
    sortedidx = np.argsort(ddd)
    return sortedidx

def undelivered_orders(orderlist):
    i = 0
    for (_, _, _, filldate) in orderlist:
        i += 1
        if filldate != None:
            break
    return i

# scheduling available with updated orders
def updatescedule(Q, maxitem, orderlist):
    dict = {201: 1, 202: 2, 203: 3, 103: 4, 102: 5, 101: 6} # order._address = key
    curr = -1
    Dlist = []
    while Q.empty() == False:
        order = Q.get()
        orderlist.append((order, order._N, dict[order._address], order._filldate))
    # sort by N of items
    k = undelivered_orders(orderlist)
    if k == len(orderlist):
        k = 0
    orderlist = sorted(orderlist[k:], key=lambda x: x[1])
    #pcknum = np.zeros(len(orderlist))
    orderlist = np.asarray(orderlist)
    # sort by address if N of items is same
    for i in range(orderlist.shape[0]):
        idx = np.where(orderlist[:,1]==orderlist[i,1])[0]
        if idx.shape[0] != 1 and i==idx[0]:
            if i != 0:
                curr = orderlist[i - 1][2]
            sortedidx = distance(orderlist[idx,2], curr)
            temp = orderlist[idx]
            temp2 = temp[sortedidx]
            orderlist[idx] = temp2
            #orderlist[idx] = orderlist[idx[sortedidx]]
    '''for i in range(len(orderlist)):
        pcknum[i] = int(np.sum(orderlist[:i+1,1])/maxitem)
    for i in range(int(pcknum[-1])):
        pck = np.where(pcknum==i)[0]
        if pck.shape[0] != 1:
            idx = np.argsort(np.asarray(orderlist[pck,2]))
            temp = orderlist[pck]
            temp2 = temp[idx]
            orderlist[pck] = temp2
            #orderlist[pck] = orderlist[idx]'''
    for (order, n, addidx, _) in orderlist:
        for i in range(n):
            Dlist.append([order, addidx])
    cycle = int(len(Dlist) / maxitem)
    for i in range(cycle):
        p = Dlist[i * maxitem:(i + 1) * maxitem]
        p2 = sorted(p, key=lambda x: x[1])
        Dlist[i * maxitem:(i + 1) * maxitem] = p2
    Dlist = np.asarray(Dlist)[:,0]
    return Dlist.tolist(), orderlist.tolist()

# backward movement added
def UpdateandBack(Q, maxitem, orderlist):
    dict = {201: 1, 202: 2, 203: 3, 103: 4, 102: 5, 101: 6} # order._address = key
    curr = -1
    Dlist = []
    back = 0 # go forward when 0, turn 180 after this when 1, turn 180 before this when -1
    while Q.empty() == False:
        order = Q.get()
        orderlist.append([order, order._N, dict[order._address], order._filldate])
    # sort by N of items
    k = undelivered_orders(orderlist)
    if k == len(orderlist):
        k = 0
    orderlist = sorted(orderlist[k:], key=lambda x: x[1])
    #pcknum = np.zeros(len(orderlist))
    orderlist = np.asarray(orderlist)
    # sort by address if N of items is same
    for i in range(orderlist.shape[0]):
        idx = np.where(orderlist[:,1]==orderlist[i,1])[0]
        if idx.shape[0] != 1 and i==idx[0]:
            if i != 0:
                curr = orderlist[i - 1][2]
            sortedidx = distance(orderlist[idx,2], curr)
            temp = orderlist[idx]
            temp2 = temp[sortedidx]
            orderlist[idx] = temp2
            #orderlist[idx] = orderlist[idx[sortedidx]]
    '''for i in range(len(orderlist)):
        pcknum[i] = int(np.sum(orderlist[:i+1,1])/maxitem)
    for i in range(int(pcknum[-1])):
        pck = np.where(pcknum==i)[0]
        if pck.shape[0] != 1:
            idx = np.argsort(np.asarray(orderlist[pck,2]))
            temp = orderlist[pck]
            temp2 = temp[idx]
            orderlist[pck] = temp2'''
    for (order, n, addidx, _) in orderlist:
        for i in range(n):
            Dlist.append([order, back, addidx])
    # backward condition
    cycle = int(len(Dlist)/maxitem)
    for i in range(cycle):
        p = Dlist[i*maxitem:(i+1)*maxitem]
        p2 = sorted(p, key=lambda x: x[1])
        if p2[-1][2] < 4:
            p2[-1][1] = 1 # turn 180 degree after this delivery
            Dlist[(i+1)*maxitem][1] = -1
        elif p2[0][2] > 3:
            p2[0][1] = -1  # turn 180 degree before going this address
            p2[-1][1] = 1 # turn 180 after delivering this address
        Dlist[i*maxitem:(i+1)*maxitem] = p2
    Dlist0 = np.asarray(Dlist)[:,0]
    Dlist1 = np.asarray(Dlist)[:,1]
    Dlist = np.vstack((Dlist0, Dlist1)).transpose()
    return Dlist.tolist(), orderlist.tolist()


def BackSimple(Q, maxitem, orderlist):
    dict = {201: 1, 202: 2, 203: 3, 103: 4, 102: 5, 101: 6} # order._address = key
    curr = -1
    Dlist = []
    back = 0 # go forward when 0, go backward after this when 1
    while Q.empty() == False:
        order = Q.get()
        orderlist.append([order, order._N, dict[order._address], order._filldate])
    # sort by N of items
    k = undelivered_orders(orderlist)
    if k == len(orderlist):
        k = 0
    orderlist = sorted(orderlist[k:], key=lambda x: x[1])
    orderlist = np.asarray(orderlist)
    # sort by address if N of items is same
    for i in range(orderlist.shape[0]):
        idx = np.where(orderlist[:,1]==orderlist[i,1])[0]
        if idx.shape[0] != 1 and i==idx[0]:
            if i != 0:
                curr = orderlist[i - 1][2]
            sortedidx = distance(orderlist[idx,2], curr)
            temp = orderlist[idx]
            temp2 = temp[sortedidx]
            orderlist[idx] = temp2
    for (order, n, addidx, _) in orderlist:
        for i in range(n):
            Dlist.append([order, back, addidx])
    # backward condition
    cycle = int(len(Dlist)/maxitem)
    for i in range(cycle):
        p = Dlist[i*maxitem:(i+1)*maxitem]
        p2 = sorted(p, key=lambda x: x[1])
        if p2[-1][2] == 1: # all the order address = 201
            p2[-1][1] = 1 # turn 180 degree after this delivery
            #Dlist[(i+1)*maxitem][1] = -1
        elif p2[0][2] == 6: # all the order address = 101
            p2[0][1] = 1  # turn 180 after delivering this address
        Dlist[i*maxitem:(i+1)*maxitem] = p2
    Dlist0 = np.asarray(Dlist)[:,0]
    Dlist1 = np.asarray(Dlist)[:,1]
    Dlist = np.vstack((Dlist0, Dlist1)).transpose()
    return Dlist.tolist(), orderlist.tolist()
