function random(min, max) {
  return min + Math.floor(Math.random() * (max + 1 - min));
}

for (let i = 0; i < 100; ++i) {
  console.log(random(1, 9));
}
