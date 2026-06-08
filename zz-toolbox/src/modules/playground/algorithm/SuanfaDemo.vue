<template>
  <div class="suanfa-demo-container">
    <div class="demo-layout">
      <!-- 左侧功能菜单 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h3>算法与数据结构</h3>
        </div>
        <div class="menu-list">
          <div
            v-for="(item, index) in demoList"
            :key="index"
            :class="['menu-item', { active: currentIndex === index }]"
            @click="switchDemo(index)"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-text">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧展示区域 -->
      <div class="content">
        <div class="content-header">
          <h2>{{ currentDemo.name }}</h2>
          <p class="description">{{ currentDemo.description }}</p>
        </div>

        <div class="demo-wrapper">
          <!-- 栈 Stack -->
          <div v-if="currentIndex === 0" class="demo-content stack-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">栈 (Stack) - LIFO</div>
                <div class="controls">
                  <input v-model="stackInput" placeholder="输入元素" @keyup.enter="pushStack" />
                  <button @click="pushStack">入栈</button>
                  <button @click="popStack">出栈</button>
                  <button @click="peekStack">查看栈顶</button>
                  <button @click="clearStack" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="stack-visual">
                    <div
                      v-for="(item, idx) in stackItems"
                      :key="idx"
                      class="stack-item"
                      :style="{ bottom: `${idx * 40}px` }"
                    >
                      {{ item }}
                    </div>
                  </div>
                  <div class="info">
                    <p>栈大小: {{ stackItems.length }}</p>
                    <p>栈顶: {{ stackItems.length ? stackItems[stackItems.length - 1] : '空' }}</p>
                    <p>是否为空: {{ isEmpty ? '是' : '否' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 队列 Queue -->
          <div v-else-if="currentIndex === 1" class="demo-content queue-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">队列 (Queue) - FIFO</div>
                <div class="controls">
                  <input v-model="queueInput" placeholder="输入元素" @keyup.enter="enqueue" />
                  <button @click="enqueue">入队</button>
                  <button @click="dequeue">出队</button>
                  <button @click="clearQueue" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="queue-visual">
                    <div
                      v-for="(item, idx) in queueItems"
                      :key="idx"
                      class="queue-item"
                    >
                      {{ item }}
                    </div>
                  </div>
                  <div class="info">
                    <p>队头: {{ queueItems.length ? queueItems[0] : '空' }}</p>
                    <p>队列大小: {{ queueItems.length }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 链表 LinkedList -->
          <div v-else-if="currentIndex === 2" class="demo-content linkedlist-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">单向链表 (LinkedList)</div>
                <div class="controls">
                  <input v-model="linkedListInput" placeholder="输入元素" @keyup.enter="appendLinkedList" />
                  <button @click="appendLinkedList">添加</button>
                  <button @click="removeLinkedListHead">删除头节点</button>
                  <button @click="clearLinkedList" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="linkedlist-visual">
                    <div
                      v-for="(item, idx) in linkedListItems"
                      :key="idx"
                      class="linkedlist-item"
                    >
                      <span class="node">{{ item }}</span>
                      <span class="arrow" v-if="idx < linkedListItems.length - 1">→</span>
                    </div>
                  </div>
                  <div class="info">
                    <p>节点数量: {{ linkedListItems.length }}</p>
                    <p>头节点: {{ linkedListItems.length ? linkedListItems[0] : '空' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 集合 Set -->
          <div v-else-if="currentIndex === 3" class="demo-content set-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">集合 (Set) - 唯一元素</div>
                <div class="controls">
                  <input v-model="setInput" placeholder="输入元素" @keyup.enter="addSet" />
                  <button @click="addSet">添加</button>
                  <button @click="hasSet">查找</button>
                  <button @click="removeSet">删除</button>
                  <button @click="clearSet" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="set-visual">
                    <div
                      v-for="(item, idx) in setItems"
                      :key="idx"
                      class="set-item"
                    >
                      {{ item }}
                    </div>
                  </div>
                  <div class="info">
                    <p>集合大小: {{ setItems.length }}</p>
                    <p>元素: {{ setItems.join(', ') }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 堆 Heap -->
          <div v-else-if="currentIndex === 4" class="demo-content heap-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">堆 (Heap) - 二叉堆</div>
                <div class="controls">
                  <input v-model="heapInput" type="number" placeholder="输入数字" @keyup.enter="insertHeap" />
                  <button @click="insertHeap">插入</button>
                  <button @click="extractHeap">提取根节点</button>
                  <button @click="generateRandomHeap" class="random">随机生成</button>
                  <button @click="clearHeap" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="heap-visual">
                    <div class="heap-tree">
                      <div v-for="(item, idx) in heapItems" :key="idx" class="heap-node">
                        {{ item }}
                      </div>
                    </div>
                  </div>
                  <div class="info">
                    <p>堆大小: {{ heapItems.length }}</p>
                    <p>根节点: {{ heapItems.length ? heapItems[0] : '空' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- LRU 缓存 -->
          <div v-else-if="currentIndex === 5" class="demo-content lru-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">LRU 缓存</div>
                <div class="controls">
                  <input v-model="lruKey" placeholder="输入键" />
                  <input v-model="lruValue" placeholder="输入值" />
                  <button @click="setLru">设置</button>
                  <button @click="getLru">获取</button>
                  <button @click="clearLru" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="lru-visual">
                    <div
                      v-for="(item, idx) in lruCache"
                      :key="idx"
                      class="lru-item"
                      :class="{ active: idx === 0 }"
                    >
                      <span class="key">{{ item.key }}</span>
                      <span class="value">{{ item.value }}</span>
                    </div>
                  </div>
                  <div class="info">
                    <p>缓存大小: {{ lruCache.length }} / 5</p>
                    <p>命中结果: {{ lruResult }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 哈希表 -->
          <div v-else-if="currentIndex === 6" class="demo-content hashtable-demo">
            <div class="data-structure">
              <div class="container">
                <div class="title">哈希表 (HashTable)</div>
                <div class="controls">
                  <input v-model="hashKey" placeholder="输入键" />
                  <input v-model="hashValue" placeholder="输入值" />
                  <button @click="setHash">设置</button>
                  <button @click="getHash">获取</button>
                  <button @click="removeHash">删除</button>
                  <button @click="clearHash" class="clear">清空</button>
                </div>
                <div class="result">
                  <div class="hashtable-visual">
                    <div
                      v-for="(item, idx) in hashTable"
                      :key="idx"
                      class="hashtable-item"
                    >
                      <span class="key">{{ item.key }}</span>
                      <span class="hash">({{ hashFunction(item.key) }})</span>
                      <span class="value">{{ item.value }}</span>
                    </div>
                  </div>
                  <div class="info">
                    <p>表大小: {{ hashTable.length }}</p>
                    <p>查找结果: {{ hashResult }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 算法示例 -->
          <div v-else-if="currentIndex === 7" class="demo-content algorithm-demo">
            <div class="algorithm-examples">
              <div class="algorithm-card">
                <h3>活动安排问题</h3>
                <p>判断可以参加的活动数量</p>
                <button @click="runActivityAlgorithm">运行算法</button>
                <div class="output">
                  <p>结果: {{ activityResult }}</p>
                </div>
              </div>
              <div class="algorithm-card">
                <h3>最短路径问题</h3>
                <p>Dijkstra 算法实现</p>
                <button @click="runDijkstra">运行算法</button>
                <div class="output">
                  <p>最短距离: {{ shortestPath }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SuanfaDemo',
  data() {
    return {
      currentIndex: 0,
      
      // 栈相关数据
      stackInput: '',
      stackItems: [],
      
      // 队列相关数据
      queueInput: '',
      queueItems: [],
      
      // 链表相关数据
      linkedListInput: '',
      linkedListItems: [],
      
      // 集合相关数据
      setInput: '',
      setItems: [],
      
      // 堆相关数据
      heapInput: '',
      heapItems: [],
      
      // LRU 缓存相关数据
      lruKey: '',
      lruValue: '',
      lruCache: [],
      lruResult: '',
      
      // 哈希表相关数据
      hashKey: '',
      hashValue: '',
      hashTable: [],
      hashResult: '',
      
      // 算法结果
      activityResult: '',
      shortestPath: '',
      
      demoList: [
        { icon: '📚', name: '栈 Stack', description: '后进先出 (LIFO) 的线性数据结构' },
        { icon: '🚶', name: '队列 Queue', description: '先进先出 (FIFO) 的线性数据结构' },
        { icon: '🔗', name: '链表 LinkedList', description: '动态数据结构，节点可动态添加删除' },
        { icon: '🎯', name: '集合 Set', description: '存储唯一元素的无序集合' },
        { icon: '⛰', name: '堆 Heap', description: '特殊的完全二叉树，高效获取最大最小值' },
        { icon: '💾', name: 'LRU 缓存', description: '最近最少使用缓存策略' },
        { icon: '🗂️', name: '哈希表 HashTable', description: '键值对存储，快速查找' },
        { icon: '🧮', name: '算法示例', description: '经典算法问题演示' }
      ]
    }
  },
  computed: {
    currentDemo() {
      return this.demoList[this.currentIndex]
    },
    
    isEmpty() {
      return this.stackItems.length === 0
    }
  },
  methods: {
    switchDemo(index) {
      this.currentIndex = index
    },
    
    // ==================== 栈 Stack 操作 ====================
    pushStack() {
      if (this.stackInput.trim()) {
        this.stackItems.push(this.stackInput.trim())
        this.stackInput = ''
      }
    },
    
    popStack() {
      if (this.stackItems.length > 0) {
        return this.stackItems.pop()
      }
    },
    
    peekStack() {
      return this.stackItems.length > 0 ? this.stackItems[this.stackItems.length - 1] : '栈为空'
    },
    
    clearStack() {
      this.stackItems = []
    },
    
    // ==================== 队列 Queue 操作 ====================
    enqueue() {
      if (this.queueInput.trim()) {
        this.queueItems.push(this.queueInput.trim())
        this.queueInput = ''
      }
    },
    
    dequeue() {
      if (this.queueItems.length > 0) {
        return this.queueItems.shift()
      }
    },
    
    clearQueue() {
      this.queueItems = []
    },
    
    // ==================== 链表 LinkedList 操作 ====================
    appendLinkedList() {
      if (this.linkedListInput.trim()) {
        this.linkedListItems.push(this.linkedListInput.trim())
        this.linkedListInput = ''
      }
    },
    
    removeLinkedListHead() {
      if (this.linkedListItems.length > 0) {
        this.linkedListItems.shift()
      }
    },
    
    clearLinkedList() {
      this.linkedListItems = []
    },
    
    // ==================== 集合 Set 操作 ====================
    addSet() {
      if (this.setInput.trim() && !this.setItems.includes(this.setInput.trim())) {
        this.setItems.push(this.setInput.trim())
        this.setInput = ''
      } else if (this.setItems.includes(this.setInput.trim())) {
        alert('元素已存在！')
      }
    },
    
    hasSet() {
      if (this.setInput.trim()) {
        alert(this.setItems.includes(this.setInput.trim()) ? '存在' : '不存在')
      }
    },
    
    removeSet() {
      const idx = this.setItems.indexOf(this.setInput.trim())
      if (idx !== -1) {
        this.setItems.splice(idx, 1)
      }
    },
    
    clearSet() {
      this.setItems = []
    },
    
    // ==================== 堆 Heap 操作 ====================
    insertHeap() {
      const num = parseInt(this.heapInput)
      if (!isNaN(num)) {
        this.heapItems.push(num)
        this.heapifyUp(this.heapItems.length - 1)
        this.heapInput = ''
      }
    },
    
    extractHeap() {
      if (this.heapItems.length === 0) return null
      
      const root = this.heapItems[0]
      const last = this.heapItems.pop()
      
      if (this.heapItems.length > 0) {
        this.heapItems[0] = last
        this.heapifyDown(0)
      }
      
      return root
    },
    
    heapifyUp(index) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (parentIndex >= 0 && this.heapItems[index] > this.heapItems[parentIndex]) {
        [this.heapItems[index], this.heapItems[parentIndex]] = [this.heapItems[parentIndex], this.heapItems[index]]
        this.heapifyUp(parentIndex)
      }
    },
    
    heapifyDown(index) {
      const leftChildIndex = index * 2 + 1
      const rightChildIndex = index * 2 + 2
      let largestIndex = index
      
      if (leftChildIndex < this.heapItems.length && this.heapItems[leftChildIndex] > this.heapItems[largestIndex]) {
        largestIndex = leftChildIndex
      }
      
      if (rightChildIndex < this.heapItems.length && this.heapItems[rightChildIndex] > this.heapItems[largestIndex]) {
        largestIndex = rightChildIndex
      }
      
      if (largestIndex !== index) {
        [this.heapItems[index], this.heapItems[largestIndex]] = [this.heapItems[largestIndex], this.heapItems[index]]
        this.heapifyDown(largestIndex)
      }
    },
    
    generateRandomHeap() {
      this.heapItems = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100))
      this.buildHeap()
    },
    
    buildHeap() {
      for (let i = Math.floor(this.heapItems.length / 2) - 1; i >= 0; i--) {
        this.heapifyDown(i)
      }
    },
    
    clearHeap() {
      this.heapItems = []
    },
    
    // ==================== LRU 缓存操作 ====================
    setLru() {
      if (!this.lruKey.trim() || !this.lruValue.trim()) return
      
      const existingIndex = this.lruCache.findIndex(item => item.key === this.lruKey.trim())
      
      if (existingIndex !== -1) {
        // 如果已存在，移到最前面
        this.lruCache.splice(existingIndex, 1)
        this.lruCache.unshift({ key: this.lruKey.trim(), value: this.lruValue.trim() })
      } else {
        // 如果不存在，添加到最前面
        if (this.lruCache.length >= 5) {
          this.lruCache.pop() // 删除最后一个（最久未使用）
        }
        this.lruCache.unshift({ key: this.lruKey.trim(), value: this.lruValue.trim() })
      }
      
      this.lruKey = ''
      this.lruValue = ''
      this.lruResult = '设置成功'
    },
    
    getLru() {
      const item = this.lruCache.find(item => item.key === this.lruKey.trim())
      if (item) {
        // 移到最前面
        this.lruCache = this.lruCache.filter(i => i.key !== item.key)
        this.lruCache.unshift(item)
        this.lruResult = `找到: ${item.value}`
      } else {
        this.lruResult = '未找到'
      }
    },
    
    clearLru() {
      this.lruCache = []
      this.lruResult = '已清空'
    },
    
    // ==================== 哈希表操作 ====================
    hashFunction(key) {
      let hash = 0
      for (let i = 0; i < key.length; i++) {
        hash += key.charCodeAt(i)
      }
      return hash % 37
    },
    
    setHash() {
      if (!this.hashKey.trim() || !this.hashValue.trim()) return
      
      this.hashTable.push({
        key: this.hashKey.trim(),
        value: this.hashValue.trim()
      })
      
      this.hashKey = ''
      this.hashValue = ''
      this.hashResult = '设置成功'
    },
    
    getHash() {
      const item = this.hashTable.find(i => i.key === this.hashKey.trim())
      this.hashResult = item ? `找到: ${item.value}` : '未找到'
    },
    
    removeHash() {
      const idx = this.hashTable.findIndex(i => i.key === this.hashKey.trim())
      if (idx !== -1) {
        this.hashTable.splice(idx, 1)
        this.hashResult = '删除成功'
      } else {
        this.hashResult = '未找到'
      }
    },
    
    clearHash() {
      this.hashTable = []
      this.hashResult = '已清空'
    },
    
    // ==================== 算法示例 ====================
    runActivityAlgorithm() {
      const activities = [
        { start: 1, end: 4 },
        { start: 3, end: 5 },
        { start: 0, end: 6 },
        { start: 5, end: 7 },
        { start: 3, end: 8 },
        { start: 5, end: 9 },
        { start: 6, end: 10 },
        { start: 8, end: 11 },
        { start: 8, end: 12 },
        { start: 2, end: 13 },
        { start: 12, end: 14 }
      ]
      
      activities[0].canDo = true
      let preActive = 0
      let count = 1
      
      for (let i = 1; i < activities.length; i++) {
        if (activities[i].start >= activities[preActive].end) {
          activities[i].canDo = true
          preActive = i
          count++
        } else {
          activities[i].canDo = false
        }
      }
      
      const canDoList = activities.filter(a => a.canDo).map(a => `[${a.start}, ${a.end}]`)
      this.activityResult = `可参加 ${count} 个活动: ${canDoList.join(', ')}`
    },
    
    runDijkstra() {
      // 简化的图结构
      const graph = {
        1: { 2: 10, 5: 100 },
        2: { 3: 50, 4: 30 },
        3: { 5: 10 },
        4: { 3: 20, 5: 60 },
        5: {}
      }
      
      // Dijkstra 算法
      const distances = { 1: 0 }
      const visited = new Set()
      const startNode = 1
      
      for (const node in graph) {
        if (node != startNode) {
          distances[node] = Infinity
        }
      }
      
      while (visited.size < Object.keys(graph).length) {
        // 找到未访问的最短距离节点
        let minDistance = Infinity
        let currentNode = null
        
        for (const node in distances) {
          if (!visited.has(Number(node)) && distances[node] < minDistance) {
            minDistance = distances[node]
            currentNode = Number(node)
          }
        }
        
        visited.add(currentNode)
        
        // 更新邻居距离
        for (const neighbor in graph[currentNode]) {
          const newDistance = distances[currentNode] + graph[currentNode][neighbor]
          if (newDistance < distances[neighbor]) {
            distances[neighbor] = newDistance
          }
        }
      }
      
      this.shortestPath = `从节点 1 到各节点的最短距离: ${JSON.stringify(distances, null, 2)}`
    }
  }
}
</script>

<style lang="scss" scoped>
// ==================== 全局样式 ====================
.suanfa-demo-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .demo-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
}

// ==================== 侧边栏样式 ====================
.sidebar {
  width: 280px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;

  .sidebar-header {
    padding: 20px;
    background: rgba(0, 0, 0, 0.1);

    h3 {
      margin: 0;
      color: #fff;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .menu-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      margin: 5px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #fff;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateX(5px);
      }

      &.active {
        background: rgba(255, 255, 255, 0.25);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      }

      .menu-icon {
        font-size: 20px;
        margin-right: 12px;
        width: 30px;
        text-align: center;
      }

      .menu-text {
        font-size: 14px;
        font-weight: 500;
        flex: 1;
      }
    }
  }
}

// ==================== 内容区域样式 ====================
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 30px;
  overflow: hidden;

  .content-header {
    margin-bottom: 20px;
    text-align: center;

    h2 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #333;
      font-weight: 600;
    }

    .description {
      margin: 0;
      font-size: 16px;
      color: #666;
    }
  }

  .demo-wrapper {
    flex: 1;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: hidden;

    .demo-content {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

// ==================== 数据结构通用样式 ====================
.data-structure {
  width: 100%;
  max-width: 900px;

  .container {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 30px;
    width: 100%;

    .title {
      font-size: 22px;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      text-align: center;
    }

    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 25px;
      flex-wrap: wrap;
      justify-content: center;

      input {
        padding: 10px 15px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.3s ease;

        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }

      button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        &:active {
          transform: translateY(0);
        }

        &.clear {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }

        &.random {
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
        }
      }
    }

    .result {
      display: flex;
      gap: 20px;
      align-items: flex-start;

      .info {
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        min-width: 200px;

        p {
          margin: 8px 0;
          font-size: 14px;
          color: #666;
          
          strong {
            color: #333;
            font-weight: 600;
          }
        }
      }
    }
  }
}

// ==================== 栈可视化 ====================
.stack-demo {
  .stack-visual {
    width: 200px;
    height: 300px;
    background: linear-gradient(to bottom, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    position: relative;
    border: 3px solid #5a67d8;

    .stack-item {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 140px;
      height: 35px;
      background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
}

// ==================== 队列可视化 ====================
.queue-demo {
  .queue-visual {
    display: flex;
    gap: 10px;
    padding: 20px;
    background: linear-gradient(to right, #4ecdc4 0%, #44a08d 100%);
    border-radius: 8px;
    min-height: 80px;
    min-width: 600px;
    border: 3px solid #3da58d;

    .queue-item {
      width: 60px;
      height: 60px;
      background: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.3s ease;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
}

// ==================== 链表可视化 ====================
.linkedlist-demo {
  .linkedlist-visual {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    padding: 30px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    border-radius: 8px;
    min-height: 80px;
    min-width: 600px;
    border: 3px solid #d63031;

    .linkedlist-item {
      display: flex;
      align-items: center;
      gap: 5px;

      .node {
        width: 50px;
        height: 50px;
        background: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: #333;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .arrow {
        color: #fff;
        font-size: 24px;
        font-weight: bold;
      }
    }
  }
}

// ==================== 集合可视化 ====================
.set-demo {
  .set-visual {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 25px;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border-radius: 8px;
    min-height: 80px;
    min-width: 600px;
    border: 3px solid #d946ef;

    .set-item {
      width: 60px;
      height: 60px;
      background: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      animation: popIn 0.3s ease;
    }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
}

// ==================== 堆可视化 ====================
.heap-demo {
  .heap-visual {
    .heap-tree {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      padding: 30px;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 8px;
      min-height: 150px;
      min-width: 600px;
      border: 3px solid #00d2d3;

      .heap-node {
        width: 60px;
        height: 60px;
        background: #fff;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 18px;
        color: #333;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        animation: bounceIn 0.3s ease;
      }
    }
  }

  @keyframes bounceIn {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
}

// ==================== LRU 可视化 ====================
.lru-demo {
  .lru-visual {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 25px;
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
    border-radius: 8px;
    min-height: 200px;
    min-width: 600px;
    border: 3px solid #76b852;

    .lru-item {
      display: flex;
      gap: 15px;
      padding: 15px 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &.active {
        border: 2px solid #76b852;
        transform: scale(1.05);
      }

      .key {
        font-weight: 600;
        color: #333;
      }

      .value {
        color: #666;
      }

      .recent {
        font-size: 12px;
        color: #76b852;
        margin-left: auto;
      }
    }
  }
}

// ==================== 哈希表可视化 ====================
.hashtable-demo {
  .hashtable-visual {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 25px;
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    border-radius: 8px;
    min-height: 150px;
    min-width: 600px;
    border: 3px solid #f39c12;

    .hashtable-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 15px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-width: 100px;

      .key {
        font-weight: 600;
        color: #333;
      }

      .hash {
        font-size: 12px;
        color: #999;
        font-family: monospace;
      }

      .value {
        color: #666;
      }
    }
  }
}

// ==================== 算法示例 ====================
.algorithm-demo {
  width: 100%;
  max-width: 800px;

  .algorithm-examples {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;

    .algorithm-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 30px;
      width: 320px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }

      h3 {
        margin: 0 0 15px 0;
        font-size: 20px;
        color: #333;
        font-weight: 600;
      }

      p {
        margin: 0 0 20px 0;
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }

      button {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .output {
        margin-top: 20px;
        padding: 15px;
        background: #fff;
        border-radius: 8px;
        border-left: 4px solid #667eea;

        p {
          margin: 0;
          font-size: 14px;
          color: #333;
          line-height: 1.6;
          word-break: break-all;
        }
      }
    }
  }
}
</style>
