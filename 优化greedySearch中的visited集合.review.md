### 建议名称：优化greedySearch中的visited集合

#### 问题描述：
在 `src/graph-search.ts` 和 `src/vamana-index.ts` 中的 `greedySearch` 函数，`visited` 集合用于记录已经访问过的节点，以避免重复处理和陷入死循环。目前，`visited` 集合使用的是 `Set<number>`：

```typescript
export function greedySearch(
  // ...
): SearchResult {
  // ...
  const visited = new Set<number>();
  // ...
  visited.add(bestCandidate.id);
  // ...
  if (!visited.has(candidate.id)) {
  // ...
}
```

`Set<number>` 在处理大量节点时，虽然提供了方便的 `add` 和 `has` 操作，但其内部实现可能涉及哈希表，这会带来一定的内存开销和查找时间。对于节点 ID 这种连续的整数序列，使用更紧凑的数据结构可以提高性能。

#### 优化建议：
将 `visited` 集合替换为 `Uint8Array` 或 `BitSet`。由于节点 ID 是从 0 开始的连续整数，我们可以使用一个 `Uint8Array` 来表示每个节点是否被访问过，其中数组的索引对应节点 ID，数组的值（0 或 1）表示访问状态。

例如，在 `greedySearch` 函数内部：

```typescript
// 假设 nodes.length 是已知的最大节点ID + 1
const visited = new Uint8Array(nodes.length); // 初始化所有值为0
// ...
visited[bestCandidate.id] = 1; // 标记为已访问
// ...
if (visited[neighborId] === 0) { // 检查是否未访问
  // ...
}
```

#### 预期收益：
*   **减少内存开销**：`Uint8Array` 比 `Set<number>` 占用更少的内存，因为每个元素只占用一个字节，而 `Set` 的每个元素可能需要更多的内存来存储哈希值和指针。
*   **提高查找速度**：数组的索引访问是 O(1) 操作，通常比哈希表的查找更快，因为它避免了哈希计算和潜在的哈希冲突。
*   **改善CPU缓存命中率**：连续的内存布局有助于CPU缓存的利用，进一步提升性能。
*   **降低垃圾回收压力**：减少了对象的创建和销毁，从而减少了垃圾回收的频率和时间。

#### 备注：
*   `Uint8Array` 的大小需要根据最大可能的节点数量来确定。在 `vamana-index.ts` 中，`nodes.length` 可以作为这个大小的依据。
*   如果节点 ID 不连续或者存在大量删除操作导致稀疏，`BitSet` 可能是更好的选择，但对于当前场景，`Uint8Array` 已经足够高效。