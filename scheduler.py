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
            #dist = distance(orderlist[idx][2], curr) # 이전주소와 거리계산
            #dist sort -> index 받아서 orderlist[idx]로
            addsort = sorted(orderlist[idx], key=lambda x: x[2])
            addsort = np.asarray(addsort)
            orderlist[idx] = addsort
    for n in range(orderlist.shape[0]):
        Dlist.append(orderlist[n][0])
    return Dlist

def distance(adds, curr): # 얘를 수정
    a = 3
    b = 2
    c = 2
    d = [a, b, b, a, c, c] # 201-101-102-103-203-202-201
    dist = 0
    for i in range(adds.shape[0]):
        add = adds[i]
        if curr != add: # next address != previous address
            if curr == -1:
                dist = np.sum(d[:add-1])
            else:
                if curr < add:
                    dist = np.sum(d[curr:add-1])
                else:
                    dist = np.sum(d[curr:]) + np.sum(d[:add-1])
    return dist

