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
    for n in range(orderlist.shape[0]):
        Dlist.append(orderlist[n][0])
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
    for n in range(orderlist.shape[0]):
        Dlist.append(orderlist[n][0])
    return Dlist
