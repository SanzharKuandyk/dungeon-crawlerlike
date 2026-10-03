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
import "./styles/heroes.css";
import "./styles/crew-stage.css";
import "./styles/player-status.css";
import "./styles/combat.css";
import "./styles/map.css";
import "./styles/layout.css";
import "./styles/landscape.css";
import "./styles/route-screen.css";
import "./styles/inscriptions.css";

for (const [name, value] of Object.entries(NEUTRALS))
  document.documentElement.style.setProperty(
    `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
    value,
  );
const target = document.getElementById("app");
if (target) mount(App, { target });
