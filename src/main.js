const app = document.querySelector("#app");

if (!app) {
  throw new Error("Pokenergy root element (#app) was not found.");
}

console.log("Pokenergy: new incremental game foundation initialized.");
