import { lazy } from 'react'
import type { LevelDef } from './types'

const g = (id: string) => lazy(() => import(`./${id}/Game.tsx`))
const d = (id: string) => lazy(() => import(`./${id}/Diorama.tsx`))

export const RESUME = 'https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf'
export const CONTACT = [
  { label: 'Email', href: 'mailto:govindasince2004@gmail.com' },
  { label: 'X', href: 'https://x.com/Govinda_00000' },
  { label: 'GitHub', href: 'https://github.com/GC-WORK11' },
  { label: 'LinkedIn', href: 'https://in.linkedin.com/in/govinda-flow' },
  { label: 'Résumé', href: RESUME },
]

export const LEVELS: LevelDef[] = [
  {
    id: 'L01', kind: 'level', place: 'IIT Patna · 2023', title: 'The first step',
    line: 'In 2023 I started a BS at IIT Patna. Hybrid classes, one laptop, a lot of time to build.',
    task: 'Light the lamps to wake the campus.',
    story: 'I started a BS at IIT Patna in 2023. Classes were mostly online, so the laptop became my workshop.',
    tech: 'This world is the portfolio. Every island is a real project, and each one opens after a short game that shows how it works.',
    links: [{ label: 'Résumé', href: RESUME }], badge: 'Arrival',
    palette: { ground: '#9cbf74', accent: '#d9825b' }, Game: g('L01'), Diorama: d('L01'),
  },
  {
    id: 'L02', kind: 'level', place: 'The closed gates', title: 'Rejections',
    line: 'Some doors said no. I kept the letters.',
    task: 'Fold each letter into a stone and cross the gap.',
    story: 'I applied to fellowships and founder programs and was turned down, again and again. Each no told me what to build next.',
    tech: 'No code here, just a habit: write down why it failed, then make the next thing answer it.',
    links: [], badge: 'Stepping stones',
    palette: { ground: '#a9b88a', accent: '#8c7a6b' }, Game: g('L02'), Diorama: d('L02'),
  },
  {
    id: 'I01', kind: 'interlude', place: 'In between', title: 'Stillness',
    line: 'After a hard week I sit by the water for a while.',
    task: 'Hold to breathe, three slow times.',
    story: 'Meditation is how I reset. A few slow breaths, then back to the work.',
    tech: '',
    links: [], badge: 'Stillness',
    palette: { ground: '#a4c38a', accent: '#7fa7b5' }, Game: g('I01'), Diorama: d('I01'),
  },
  {
    id: 'L03', kind: 'level', place: 'Weekends', title: 'First websites',
    line: 'I shipped small sites on weekends to see if anyone cared.',
    task: 'Snap the pieces of a page into place.',
    story: 'CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE. Each one took a weekend, so the idea could meet real people fast.',
    tech: 'React front ends shipped on Vercel. Doorway grew into a cockpit for running terminal coding agents side by side.',
    links: [
      { label: 'CEO Hunt', href: 'https://ceohunt.vercel.app/' },
      { label: 'Flow Pitch', href: 'https://flow-pitch.vercel.app' },
      { label: 'Workbench', href: 'https://delegators-workbench.vercel.app' },
      { label: 'Doorway', href: 'https://doorway-ide.vercel.app/' },
    ], badge: 'Shipper',
    palette: { ground: '#b5c27a', accent: '#e0a458' }, Game: g('L03'), Diorama: d('L03'),
  },
  {
    id: 'L04', kind: 'level', place: 'Delhi · Oct 2026', title: 'Alive',
    line: 'Four days at the AWS × WeMakeDevs Environmental Hacks. Delhi’s air, street by street.',
    task: 'Place the sensors and clear the smog.',
    story: 'ALive maps Delhi’s air street by street. I built it at the AWS × WeMakeDevs Environmental Hacks, demoed at DTU and launched on Oct 11.',
    tech: 'Air readings refresh every 15 minutes and are spread across the street map, with 240k searchable places.',
    links: [
      { label: 'Live', href: 'https://delhi-is-alive.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/GC-WORK11/ALive' },
    ], badge: 'Clear air',
    palette: { ground: '#8fbf7a', accent: '#6fa58a' }, Game: g('L04'), Diorama: d('L04'),
  },
  {
    id: 'L05', kind: 'level', place: 'Aug – Sep 2026', title: 'Ent',
    line: 'No GPU cluster. Four laptops on home Wi-Fi.',
    task: 'Split the model’s layers so every laptop can hold its share.',
    story: 'Ent splits one large model across ordinary laptops. In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi.',
    tech: 'Written in Rust. Layers are placed on each machine by how much memory it has, and activations pass between them over the network. My working-set routing paper reports 53.7% less GPU memory.',
    links: [
      { label: 'Ent', href: 'https://ent-01.vercel.app' },
      { label: 'Paper', href: 'https://active-parameter-runtime.govindach-iitp.chatgpt.site/working-set-routing-paper.pdf' },
    ], badge: 'Shared weight',
    palette: { ground: '#a7bd80', accent: '#c9875f' }, Game: g('L05'), Diorama: d('L05'),
  },
  {
    id: 'I02', kind: 'interlude', place: 'Across India', title: 'On the road',
    line: 'Trains, new cities, strangers who turned into friends.',
    task: 'Ride the train to the next stop.',
    story: 'I travel whenever I can, and I like showing people around. New places reset how I see a problem.',
    tech: '',
    links: [], badge: 'Traveller',
    palette: { ground: '#c4b47c', accent: '#b5654a' }, Game: g('I02'), Diorama: d('I02'),
  },
  {
    id: 'L06', kind: 'level', place: 'Oct 2026', title: 'Remote',
    line: 'My agents kept working while I was away from the desk.',
    task: 'Send a task from the phone and watch the laptop do it.',
    story: 'Remote lets me drive the coding agents on my laptop from my phone, wherever I am.',
    tech: 'A C++20 daemon runs on the laptop and an Expo app runs on the phone. Commands stream to the agent and its output streams back.',
    links: [{ label: 'GitHub', href: 'https://github.com/GC-WORK11/remote' }], badge: 'Long reach',
    palette: { ground: '#9fc07e', accent: '#5f86a8' }, Game: g('L06'), Diorama: d('L06'),
  },
  {
    id: 'L07', kind: 'level', place: 'Oct 22, 2026', title: 'Wispr Wrap',
    line: 'I talk into my phone and the words land on my Linux laptop.',
    task: 'Say a line, or type it, and send it across.',
    story: 'Wispr Wrap: dictate on an Android phone with Wispr Flow, and the text appears at the cursor on Linux.',
    tech: 'Finished text from the phone is sent to a small service on the laptop, which types it into whatever window has focus.',
    links: [], badge: 'No keys',
    palette: { ground: '#a3c482', accent: '#8a6fb0' }, Game: g('L07'), Diorama: d('L07'),
  },
  {
    id: 'L08', kind: 'level', place: 'Oct 27 – 31, 2026', title: 'Sign Flow',
    line: 'Teach the laptop your own hand signs.',
    task: 'Match each sign to what it does.',
    story: 'Sign-Flow lets you record your own hand signs on a phone camera, then use them to type or control the laptop. Built for the #NoHandsChallenge.',
    tech: 'The camera tracks your hand, a small model learns the signs you recorded, and each sign maps to a key or an action.',
    links: [{ label: 'Live', href: 'https://sign-flow-eight.vercel.app' }], badge: 'No hands',
    palette: { ground: '#9dbf88', accent: '#d07a5a' }, Game: g('L08'), Diorama: d('L08'),
  },
  {
    id: 'L09', kind: 'finale', place: 'Now', title: 'Chalk',
    line: 'What I’m building next: a messaging app for Indian schools.',
    task: 'Open the school gate.',
    story: 'Chalk is a messaging app for Indian schools, with helpers that can turn a topic into a class test. It’s still being built.',
    tech: 'Teachers, students and parents in one place, plus bots a teacher can ask for a test on any topic.',
    links: [], badge: 'What’s next',
    palette: { ground: '#a2c27c', accent: '#d9825b' }, Game: g('L09'), Diorama: d('L09'),
  },
]
