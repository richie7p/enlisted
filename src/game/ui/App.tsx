import { useEffect } from "react";
import { useGame } from "../store";
import { setMix, unlockAudio } from "../audio";
import { loadArt } from "../assets";
import { loadCareer } from "../save";
import { CombatView } from "../combat/CombatView";
import { MainMenu, NewCareer, Settings, Credits } from "./MainMenu";
import { BaseHub, Barracks } from "./BaseHub";
import { Armory } from "./Armory";
import { MissionSelect, Briefing, Debrief, Promotion } from "./MissionFlow";
import { ServiceRecord } from "./ServiceRecord";

export function GameApp() {
  const screen = useGame((s) => s.screen);
  const career = useGame((s) => s.career);

  useEffect(() => {
    void loadArt();
    const c = loadCareer();
    if (c) useGame.setState({ career: c });
  }, []);

  useEffect(() => {
    if (career) setMix(career.settings.sfx, career.settings.music);
  }, [career]);

  useEffect(() => {
    const onFirst = () => unlockAudio();
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  switch (screen) {
    case "menu":
      return <MainMenu />;
    case "newCareer":
      return <NewCareer />;
    case "base":
      return <BaseHub />;
    case "armory":
      return <Armory />;
    case "barracks":
      return <Barracks />;
    case "record":
      return <ServiceRecord />;
    case "missions":
      return <MissionSelect />;
    case "briefing":
      return <Briefing />;
    case "combat":
      return <CombatView />;
    case "debrief":
      return <Debrief />;
    case "promotion":
      return <Promotion />;
    case "settings":
      return <Settings />;
    case "credits":
      return <Credits />;
    default:
      return <MainMenu />;
  }
}
