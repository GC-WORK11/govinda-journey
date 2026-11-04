import { lazy } from 'react'
import type { LevelDef } from './types'
import { winCfg } from '../state/store'

const g = (id: string) => lazy(() => import(`./${id}/Play.tsx`))
const d = (id: string) => lazy(() => import(`./${id}/Diorama.tsx`))

export const RESUME = 'https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf'
export const CONTACT = [
  { label: 'Email', href: 'mailto:govindasince2004@gmail.com' },
  { label: 'GitHub', href: 'https://github.com/GC-WORK11' },
  { label: 'LinkedIn', href: 'https://in.linkedin.com/in/govinda-flow' },
  { label: 'Résumé', href: RESUME },
]

export const LEVELS: LevelDef[] = [
  {
    id: 'L01', kind: 'level', place: 'IIT Patna', title: 'The first step',
    line: 'I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems.',
    task: 'Light the lamps to wake the campus.', hint: 'Tap each lamp to light it',
    story: 'For four years I have built things people can open. I love sharing what I learn.',
    tech: 'This world is a game about my projects. Each project island opens after a short game that shows how the project works.',
    links: [{ label: 'Résumé', href: RESUME }], badge: 'Arrival',
    palette: { ground: '#9cbf74', accent: '#d9825b' }, Play: g('L01'), Diorama: d('L01'),
  },
  {
    id: 'L02', kind: 'level', place: 'The closed gates', title: 'Letters',
    line: 'Some gates stay shut. Five letters can still become stepping stones.',
    task: 'Fold each letter into a stone and cross the gap.', hint: 'Drag each letter into the stream',
    story: 'Five letters, five stones. Each closed gate becomes a step up.',
    tech: '',
    links: [], badge: 'Stepping stones',
    palette: { ground: '#a9b88a', accent: '#8c7a6b' }, Play: g('L02'), Diorama: d('L02'),
  },
  {
    id: 'I01', kind: 'interlude', place: 'In between', title: 'Stillness',
    line: 'A quiet bench by the water. Sit for a while.',
    task: 'Hold to breathe, three slow times.', hint: 'Hold to breathe in, let go',
    story: 'A few slow breaths, then on to the next island.',
    tech: '',
    links: [], badge: 'Stillness',
    palette: { ground: '#a4c38a', accent: '#7fa7b5' }, Play: g('I01'), Diorama: d('I01'),
  },
  {
    id: 'L03', kind: 'level', place: 'Weekends', title: 'Small websites',
    line: 'Small web products, built on weekends and shipped online.',
    task: 'Snap the pieces of a page into place.', hint: 'Drag the pieces onto the frame',
    story: 'CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today.',
    tech: 'All four are React front ends, shipped on Vercel. Doorway IDE: several AI models side by side, from one thin page.',
    links: [
      { label: 'CEO Hunt', href: 'https://ceohunt.vercel.app/' },
      { label: 'Flow Pitch', href: 'https://flow-pitch.vercel.app' },
      { label: 'Delegators Workbench', href: 'https://delegators-workbench.vercel.app' },
      { label: 'Doorway IDE', href: 'https://doorway-ide.vercel.app/' },
    ], badge: 'Shipper',
    palette: { ground: '#b5c27a', accent: '#e0a458' }, Play: g('L03'), Diorama: d('L03'),
  },
  {
    id: 'L05', kind: 'level', place: 'Aug – Sep 2026', title: 'Ent',
    line: 'Four laptops, three operating systems, one 27B model, over Wi-Fi.',
    task: 'Split the model so every laptop can hold its share.', hint: 'Drag each block onto a laptop',
    story: 'I built Ent to pool ordinary laptops into one machine, so one large model can run across them. In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi.',
    tech: 'Written in Rust. Each laptop runs its share in a sandbox and never gives up more than 60% of its memory.',
    links: [
      { label: 'Ent', href: 'https://ent-01.vercel.app' },
      { label: 'Paper', href: 'https://active-parameter-runtime.govindach-iitp.chatgpt.site/working-set-routing-paper.pdf' },
    ], badge: 'Shared weight',
    palette: { ground: '#a7bd80', accent: '#c9875f' }, Play: g('L05'), Diorama: d('L05'),
  },
  {
    id: 'L04', kind: 'level', place: 'Delhi · Oct 2026', title: 'ALive',
    line: 'Street-level air for Delhi-NCR, rebuilt every 15 minutes.',
    task: 'Place the sensors and clear the smog.', hint: 'Drag the sensors onto the glowing spots',
    story: 'I built ALive for the AWS × WeMakeDevs Environmental Hacks 2026, and it runs on AWS. It shows the air at the exact spot you stand on in Delhi-NCR, and routes where you breathe less smoke.',
    tech: 'The air field is rebuilt every 15 minutes from ground monitors and a model grid. Search covers over 240,000 Delhi places.',
    links: [
      { label: 'Live', href: 'https://delhi-is-alive.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/GC-WORK11/ALive' },
    ], badge: 'Clear air',
    palette: { ground: '#8fbf7a', accent: '#6fa58a' }, Play: g('L04'), Diorama: d('L04'),
  },
  {
    id: 'I02', kind: 'interlude', place: 'Between stops', title: 'On the road',
    line: 'Off the keyboard, I like to travel and show people around.',
    task: 'Ride the train to the next stop.', hint: 'Hold to drive the train',
    story: 'A short ride and a calm stop, then on to the next island.',
    tech: '',
    links: [], badge: 'Traveller',
    palette: { ground: '#c4b47c', accent: '#b5654a' }, Play: g('I02'), Diorama: d('I02'),
  },
  {
    id: 'L06', kind: 'level', place: 'Oct 2026', title: 'Remote',
    line: 'Coding agents run on my laptop, and I steer them from my phone.',
    task: 'Send a task from the phone and watch the laptop do it.', hint: 'Tap a task on the phone',
    story: 'Remote lets me drive the coding agents on my laptop from my phone, over Wi-Fi or Tailscale.',
    tech: 'A zero-dependency C++20 daemon runs on the laptop and an Expo app runs on the phone. Prompts go to the agent, and text, screenshots and approvals stream back.',
    links: [{ label: 'Live', href: 'https://remote-01.vercel.app' }, { label: 'GitHub', href: 'https://github.com/GC-WORK11/remote' }], badge: 'Long reach',
    palette: { ground: '#9fc07e', accent: '#5f86a8' }, Play: g('L06'), Diorama: d('L06'),
  },
  {
    id: 'L07', kind: 'level', place: 'Oct 22, 2026', title: 'Wispr Wrap',
    line: 'I talk into my phone and the words land on my Linux laptop.',
    task: 'Say a line, or type it, and send it across.', hint: 'Tap the words',
    story: 'Wispr Wrap: dictate on your phone with Wispr Flow, and the text types at your cursor on Linux.',
    tech: 'Finished text from the phone is sent to a small service on the laptop, which types it into whatever window has focus.',
    links: [{ label: 'GitHub', href: 'https://github.com/GC-WORK11/wispr-wrap' }], badge: 'No keys',
    palette: { ground: '#a3c482', accent: '#8a6fb0' }, Play: g('L07'), Diorama: d('L07'),
  },
  {
    id: 'L08', kind: 'level', place: 'Oct 27 – 31, 2026', title: 'Sign-Flow',
    line: 'Teach the laptop your own hand signs.',
    task: 'Match each sign to what it does.', hint: 'Tap the hand that matches',
    story: 'Sign-Flow lets you record your own hand signs on a phone camera, then use them to type or control the laptop. Built for the #NoHandsChallenge.',
    tech: 'The phone reads 21 points on your hand, and the laptop matches each sign against the takes you recorded. Each sign types a phrase or runs an action.',
    links: [{ label: 'Live', href: 'https://sign-flow-eight.vercel.app' }, { label: 'GitHub', href: 'https://github.com/GC-WORK11/sign-wrap' }], badge: 'No hands',
    palette: { ground: '#9dbf88', accent: '#d07a5a' }, Play: g('L08'), Diorama: d('L08'),
  },
  {
    id: 'L09', kind: 'finale', place: 'Now', title: 'The schoolhouse',
    line: 'Right now I’m building ALive and Remote.',
    task: 'Open the school gate.', hint: 'Tap the right answer',
    story: 'ALive is an air map of Delhi, street by street. Remote runs the coding agents on my laptop from my phone.',
    tech: 'Each project island links to its repo or a live demo.',
    links: [], badge: 'Right now',
    palette: { ground: '#a2c27c', accent: '#d9825b' }, Play: g('L09'), Diorama: d('L09'),
  },
]


winCfg.LEVELS_IDS = LEVELS.map((l) => l.id)
