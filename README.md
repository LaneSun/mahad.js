# Mahad.js

> 来自东方的神奇力量

![](icon.png)

[示例/主页](https://lanesun.github.io/mahad.js/)

## 简介

大致上，这个库为原生的 Array 和 Object 类添加了自动数据映射的功能，此外，因为该库拓展/修改了原生类的方法，所以请注意兼容性。

## 示例

大部分DOM相关的例子都在上方的 [示例/主页](https://lanesun.github.io/mahad.js/) 页面中，也可以直接查看 [`index.html`](index.html)，其它还有部分单元测试的用例，可以在 [`test.js`](test.js) 找到。

以下是简单的示例：

```js
a = [1, 2, 3];
b = a.bmap(v => v ** 2); // 建立一个 a 的映射数据
console.log(b); // => (1 4 9)
a.set(0, 4); // 必须用专用的方法修改数据源
a.postfix(5);
console.log(b); // => (16 4 9 25) 映射数据是自动更新的
```