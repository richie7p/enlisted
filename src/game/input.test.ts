import assert from "node:assert/strict";
import { test } from "node:test";
import { Input } from "./input";
test("quick key taps between frames are captured exactly once", () => {
 const windowTarget=new EventTarget();const documentTarget=new EventTarget();
 Object.defineProperty(globalThis,"window",{configurable:true,value:windowTarget});
 Object.defineProperty(globalThis,"document",{configurable:true,value:documentTarget});
 const input=new Input();const detach=input.attach(new EventTarget() as HTMLElement);
 const key=(type:string)=>Object.assign(new Event(type),{code:"Escape",repeat:false});
 windowTarget.dispatchEvent(key("keydown"));windowTarget.dispatchEvent(key("keyup"));
 assert.equal(input.sample().pause,true);assert.equal(input.sample().pause,false);detach();
 Reflect.deleteProperty(globalThis,"window");Reflect.deleteProperty(globalThis,"document");
});
test("movement signs and diagonal normalization agree with controls",()=>{
 const input=new Input();input.setKeys(["KeyA"]);assert.equal(input.sample().moveX,-1);
 input.setKeys(["KeyD"]);assert.equal(input.sample().moveX,1);input.setKeys(["KeyW","KeyD"]);
 const a=input.sample();assert.ok(a.moveY<0);assert.ok(Math.abs(Math.hypot(a.moveX,a.moveY)-1)<1e-9);
});
