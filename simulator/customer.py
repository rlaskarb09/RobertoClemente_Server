import time 
from datetime import datetime, timedelta 
import numpy as np 
import random 
import threading 
from scipy.stats import multinomial
import queue

class customer: 
    #ID  
    #NAME 
    _RED = 0 
    _GREEN = 0 
    _BLUE = 0
    _N = 0
    _pending = 0 
    _orderdate = None
    _filldate = None
 
    _workTime = 60 * 3
    #_total_max_block = None  #per each order  


    def __init__(self,ID,address,order_count, max_block):
        self._ID = ID 
        self._address = address 
        self._order_count = order_count 
        self._max_block = max_block
    
    def make_timer_list(self): 
        tmp = random.sample(range(0, self._workTime), self._order_count)
        tmp.append(0)
        tmp = sorted(tmp) 
        timer_list = []

        for i in range(len(tmp)-1):
            timer_list.append(tmp[i+1]- tmp[i]) 

        return timer_list  

    def makeRGB(self, s):
        #random.seed(10)
        N = random.randint(1, self._max_block) 
        mu = [1/3, 1/3, 1/3]
        rv = multinomial(N,mu, seed=s)
        X = rv.rvs(1)
      
        self._RED = X[0][0] 
        self._GREEN = X[0][1] 
        self._BLUE = X[0][2]
        self._N = self._RED + self._GREEN + self._BLUE
        self._orderdate = int(s/10)+1 #시간임의로 설정?#datetime.now()
        #print(self._fill_date)
        self.print_info()
        #self._fill_date = datetime.now()


    def print_info(self):
        print("red{} blue{} green{}".format(self._RED, self._BLUE, self._GREEN))
        print(self._orderdate)
        print("reservation.php?customer={0}&red={1}&blue={2}&green={3}&pending={4}&address={5}".format(self._ID, self._RED, self._BLUE, self._GREEN, self._pending, self._address))
    
    
    def startTIMER(self, Q):
        timer_list = self.make_timer_list() 
        print(timer_list)
        for i in timer_list: 
            print("after {} second".format(i))
            timer = threading.Timer(i, self.makeRGB)
            Q.put(self)
            timer.start() 
            self.print_info()




