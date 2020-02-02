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
def smallorder(Q, Dlist):
    orderlist = []
    while Q.empty() == False:
        order = Q.get()
        orderlist.append((order, order._N))
    orderlist = sorted(orderlist, key = lambda x: x[1])
    for (order, n) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist

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

def SmallandAdd2(Q, Dlist, maxitem):
    orderlist = []
    dict = {101: 1, 102: 2, 103: 3, 203: 4, 202: 5, 201: 6} # order._address = key
    curr = -1
    pcknum = np.zeros(Q.qsize())
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
    for i in range(len(orderlist)):
        pcknum[i] = int(np.sum(orderlist[:i+1,1])/maxitem)
    for i in range(int(pcknum[-1])):
        pck = np.where(pcknum==i)[0]
        if pck.shape[0] != 1:
            idx = np.argsort(np.asarray(orderlist[pck,2]))
            orderlist[pck]=orderlist[idx]
    '''for n in range(orderlist.shape[0]):
        Dlist.append(orderlist[n][0])'''
    for (order, n, _) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist

def undelivered_orders(orderlist):
    i = 0
    for (order, _, _, filldate) in orderlist:
        i += 1
        if filldate != None:
            break
    return i

def updatescedule(Q, maxitem, orderlist):
    dict = {101: 1, 102: 2, 103: 3, 203: 4, 202: 5, 201: 6} # order._address = key
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
    pcknum = np.zeros(len(orderlist))
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
    for i in range(len(orderlist)):
        pcknum[i] = int(np.sum(orderlist[:i+1,1])/maxitem)
    for i in range(int(pcknum[-1])):
        pck = np.where(pcknum==i)[0]
        if pck.shape[0] != 1:
            idx = np.argsort(np.asarray(orderlist[pck,2]))
            temp = orderlist[pck]
            temp2 = temp[idx]
            orderlist[pck] = temp2
            #orderlist[pck] = orderlist[idx]
    for (order, n, _, _) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist, orderlist.tolist()


# 중간에 update된 order/deliver 완료된 order 구분해서 다시 scheduling 가능하게!!
