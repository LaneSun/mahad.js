// TEST

const eq = (a, b) => {
    if (a.toString() !== b.toString()) {
        console.error("Assertion failed");
        console.log(a);
        console.log("    ↓");
        console.log(b);
        console.log();
        console.log(a.toString());
        console.log("    ↓");
        console.log(b.toString());
    }
};

data = Array.unfold(10, v => [v - 1, v > 0 ? v - 1 : undefined]);
eq(data, "(0 1 2 3 4 5 6 7 8 9)");

data = ['a', 'b', 'c', 'd'];
data.exchange('a', 'c');
eq(data, "(c b a d)");

data = [0, 1, 2, 3, 4, 5, 6, 7, 8 ,9];
data.exchange(1, 2, 4, 8);
eq(data, "(0 4 5 6 7 8 3 1 2 9)");

a = [0, 1, 2, 3];
b = a.bmap(v => v ** 2);
c = b.breduce((s, v) => s + v, 0);
eq(b, "(0 1 4 9)");
eq(c, "(14)");
a.set(0, 4);
eq(b, "(16 1 4 9)");
eq(c, "(30)");

a = [[0], [1], [2], [3]];
b = a.bmap(v => v.bmap(v => v ** 2));
c = b.breduce((s, v, _, $) => s + $(v)[0], 0);
eq(b, "((0) (1) (4) (9))");
eq(c, "(14)");
a[0].set(0, 4);
eq(b, "((16) (1) (4) (9))");
eq(c, "(30)");

data = [{
    id: ["lanesun"],
    money: [20],
}, {
    id: ["foo"],
    money: [16],
}, {
    id: ["bar"],
    money: [32],
}];
sum_money = data.breduce((sum, person, _, $) => sum + $(person.money).val, 0);
sort_data = data.bsort((a, b, $) => $(a.money).val - $(b.money).val);
eq(sum_money, "(68)");
eq(sort_data, "((id:(foo) money:(16)) (id:(lanesun) money:(20)) (id:(bar) money:(32)))");
data[1].money.val = 48;
eq(sum_money, "(100)");
eq(sort_data, "((id:(lanesun) money:(20)) (id:(bar) money:(32)) (id:(foo) money:(48)))");
data[1].money.val = 68;
eq(sum_money, "(120)");
eq(sort_data, "((id:(lanesun) money:(20)) (id:(bar) money:(32)) (id:(foo) money:(68)))");
