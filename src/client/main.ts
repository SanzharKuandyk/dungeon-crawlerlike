import { mount } from "svelte";
import { NEUTRALS } from "../shared/palette.js";
import App from "./App.svelte";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/ui.css";
import "./styles/screens.css";
import "./styles/host.css";
import "./styles/developer.css";
import "./styles/scene.css";
import "./styles/play.css";
import "./styles/map.css";
import "./styles/inventory.css";
import "./styles/trials.css";
import "./styles/hero-effects.css";
import "./styles/enemy-readout.css";

for (const [name, value] of Object.entries(NEUTRALS))
  document.documentElement.style.setProperty(
    `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
    value,
  );
const target = document.getElementById("app");
if (target) mount(App, { target });
