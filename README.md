# Bitelog

A little tool for sharing [Bitesnap](https://getbitesnap.com/) logs. See it [live](https://joelogs.com)

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

### Deploy set-up
Currently using Firebase for hosting. As a result may need to do some set-up to get things working

```
# install firebase tools
npm install -g firebase-tools
# login
firebase login
```

Now should be able to use `yarn deploy` and make things work as expected :)

Note: Firebase serves content directly from `build`, so ensure `yarn build` has run ever using `firebase deploy` directly. Better to use `yarn deploy` unless you have a specific reason not to.

### Useful commands
* `make repl` -- Fire up a repl, space for easily importing and iterating
* `make compress` -- compress images through TinyPNG
* `make deploy` -- deploy site as is
* `make deploy-data` -- process all data and then deploy
* `make new-note` -- Add and commit a new note
* `make edit-notes` -- similar to `make new-note` but more convenient for just editing notes (usually to correct some typo)
