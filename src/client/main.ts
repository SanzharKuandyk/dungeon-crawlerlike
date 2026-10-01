import { mount } from "svelte";
import { NEUTRALS } from "../shared/palette.js";
import App from "./App.svelte";
import "./styles/global.css";
import "./styles/landing.css";
import "./styles/arena.css";
import "./styles/controls.css";
import "./styles/screens.css";
import "./styles/responsive.css";
import "./styles/dungeon.css";
import "./styles/expedition.css";

for (const [name, value] of Object.entries(NEUTRALS))
  document.documentElement.style.setProperty(
    `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
    value,
  );
const target = document.getElementById("app");
if (target) mount(App, { target });
