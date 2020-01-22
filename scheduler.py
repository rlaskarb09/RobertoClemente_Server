import queue

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
        #Dlist.append(order._N)
    orderlist = sorted(orderlist, key = lambda x: x[1])
    for (order, n) in orderlist:
        for i in range(n):
            Dlist.append(order)
    return Dlist

# item수 + address
def SmallandAdd(Q, Dlist):

    return Dlist

