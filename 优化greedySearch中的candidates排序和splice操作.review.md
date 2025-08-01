### 建议名称：优化greedySearch中的candidates排序和splice操作

#### 问题描述：
在 `src/graph-search.ts` 和 `src/vamana-index.ts` 中的 `greedySearch` 函数，为了保持 `candidates` 数组的大小限制（`beamSize`），在每次添加新候选后，都会进行排序和 `splice` 操作：

```typescript
    // 保持候选集大小限制
    if (candidates.length > beamSize) {
      candidates.sort((a, b) => a.distance - b.distance);
      candidates.splice(beamSize);
      
      // 更新candidateSet
      candidateSet.clear();
      for (const candidate of candidates) {
        candidateSet.add(candidate.id);
      }
    }
```

`candidates.sort()` 的时间复杂度是 O(N log N)，`splice()` 的时间复杂度是 O(N)，其中 N 是 `candidates` 数组的长度。在 `greedySearch` 的循环中频繁执行这些操作，会带来显著的性能开销，尤其是在 `beamSize` 较大时。

#### 优化建议：
使用固定大小的最小堆（如 `MidiHeapGeneric`）来维护 `beamSize` 个最佳候选。`MidiHeapGeneric` 已经存在于项目中，并且设计用于这种固定容量的场景。通过使用堆，我们可以在 O(log K) 的时间复杂度内插入和替换元素，其中 K 是堆的容量（即 `beamSize`），从而避免了每次迭代的 O(N log N) 排序开销。

具体步骤：
1.  在 `greedySearch` 函数内部，将 `candidates` 数组替换为 `MidiHeapGeneric` 实例，容量设置为 `beamSize`。
2.  当添加新的候选时，如果堆未满，则直接 `push`；如果堆已满且新候选比堆顶元素更优（距离更小），则使用 `replace` 方法替换堆顶元素。
3.  在循环结束时，从堆中提取所有元素，并进行一次排序以得到最终结果。

#### 预期收益：
*   **显著提升 `greedySearch` 的性能**：将每次迭代的排序开销从 O(N log N) 降低到 O(log K)，其中 K 是 `beamSize`，通常 K 远小于 N（`candidates` 的最大长度）。
*   **减少内存分配和垃圾回收**：避免了频繁的数组创建、排序和截断操作，从而减少了内存分配和垃圾回收的压力。
*   **代码更简洁高效**：利用已有的优化数据结构，使代码逻辑更清晰。

#### 备注：
*   `MidiHeapGeneric` 默认是最小堆，这与 `greedySearch` 需要找到最近的 `beamSize` 个候选的需求相符。
*   在循环结束时，`MidiHeapGeneric` 的 `toSortedArray()` 方法可以直接返回排序好的结果，方便后续处理。