# Bitelog

A little tool for sharing [Bitesnap](https://getbitesnap.com/) logs. See it [live](http://joelogs.com)

### Background
I started using the food diary app BiteSnap, it enables you to easily log your diet from photos. I like logging my food because it makes me more mindful and eat cleaner. The only problem is logging can be annoying. Whereas using MyFitnessPal can give you 100% precision in tracking what you eat — it’s a chore to keep it up and be consistent. BiteSnap makes consistency easy at the cost of giving up some accuracy.

I’ve been using BiteSnap and enjoying it. However it is missing a few features that I wanted — like sharing your diary with others! (you can only share individual meals).

So to solve my own problems I built Bitelog :)

### Quick start
```
git clone ...
npm i
yarn start
```

### Useful commands
* `make repl` -- Fire up a repl, space for easily importing and iterating
* `make deploy` -- deploy site
* `make compress` -- compress images through TinyPNG
* `make new-data` -- deploy new data
* `make new-note` -- add and deploy new notes
* `make edit-notes` -- similar to `make new-note` but more convenient for just editing notes (usually to correct some typo)
