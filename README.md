# webapp-skeletor
This project was created for [Siege](https://siege.hackclub.com) by [Hackclub](https://hackclub.com). The theme for this project was ["Framework"](https://dictionary.cambridge.org/dictionary/learner-english/framework). The inspiration behind this project lies in the idea that the human skeletal structure serves as the **framework** of the human body. However, this project goes beyond just bones—it leverages the Foundational Model of Anatomy (FMA) Ontology, which itself is a comprehensive **framework** for representing the structure of the human body. This project uses the FMA as a foundation to explore and describe major anatomical components, providing detailed classifications and information about their roles within this broader anatomical framework.

### How to use
- On desktop
    - Use `j/k` keys or `arrow keys` to move up or down
    - Use `/` to initiate search
- On mobile
    - Just scroll as you usually would to see a list view
    - Tap on an option to open it's respective page
    - Tap the `back` button to go back to the list view
    - The search button doesn't work really well in mobile, because this project is intended to be used on desktop

## Credits

- FMA data: [Ontobee.org](https://ontobee.org/)
- Pictures and stl models: [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) by [Kevin Mattheus Moerman](https://github.com/Kevin-Mattheus-Moerman)
- Osteometric data: [DCP2.0 from Mendeley.com](https://data.mendeley.com/datasets/6xwhzs2w38/1)
- CSV Dump of FMA: [fma-sqlite](https://github.com/mhalle/fma-sqlite) by [mhalle](https://github.com/mhalle)
- [Pebble Fischer](https://hackclub.slack.com/team/U09UTARN116) for giving me the idea of how to scrape data using python (for `python/etymology.py`)
- Etymological and Pronounciation data: Scraped from [Wikitionary.org](https://en.wiktionary.org/)

### What is the FMA Ontology?
*"The Foundational Model of Anatomy Ontology (FMA) is an evolving computer-based knowledge source for biomedical informatics; it is concerned with the representation of classes or types and relationships necessary for the symbolic representation of the phenotypic structure of the human body in a form that is understandable to humans and is also navigable, parseable and interpretable by machine-based systems. Specifically, the FMA is a domain ontology that represents a coherent body of explicit declarative knowledge about human anatomy. Its ontological **framework** can be applied and extended to all other species."* [source](http://sig.biostr.washington.edu/projects/fm/AboutFM.html)

## Data list

Data should be listed as such:
- Primitive ID:
- Primitive Name:
- Composite ID:
- Composite Name:
- [Image]
- [STL view in new page]
- Specifiations
    - Size: length x breadth x height
- Metadata
    - Primitive FMA Metadata
        - FMA ID:
        - NUMERIC ID:
        - PREFERRED LABEL:
        - URI: (depends on the uptime of purl.org)
        - Parents: (depends on the uptime of purl.org)
    - Composite FMA Metadata
        - FMA ID:
        - NUMERIC ID:
        - PREFERRED LABEL:
        - URI: (depends on the uptime of purl.org)
        - Synonyms:
        - Parents: (depends on the uptime of purl.org)
- Etymology (words are listed from first to last)
    - [Word 1]
        - Etymology
        - Pronounciation
        - Link
    - (And so on)

### A few warnings:
- This is my first time working with json files and representating data, although I will try to make it as accurate as I can, but cracks may still slip through. If you find any discrepencies or know how to improve this project, please make a fork of [this project](https://Github.com/ChefYeshpal/webapp-skeletor), then create a pull request
- Images and `.stl` files might take some time to load depending on your internet connection
- This entire project is being hosted on [GitHub](https://github.com) Pages, so ofc it's uptime also depends on that.
- The specifications isn't exactly accurate
    - I honestly dont know where it kind of wen't wrong, but it'll take me a long while to be able to figure out what all entries are wrong...
- The `URI` doesn't currently work because [Archive.org](https://archive.org/) is showing a 502 error code
    - Upon searching a bit about it on the internet, I saw that it's rather unstable and usually gets outages[Reddit](https://www.reddit.com/r/semanticweb/comments/1galfob/purl_is_down/)
    - Tho seems like this has been going on for a year now...
    - I am keeping the links are they are for now, at least until I come across another website which hosts the data in a more descriptive fashion
- The etymological and pronounciation data is scraped from [Wikitionary.org](https://en.wiktionary.org/)
    - The python file used is `python/etymology.py`, and the data is in `etymologies_only.json`
    - The data can still be scoured through and refined more, but considering how it's workable, I think it's fine?
- The search function in the mobile view isn't very responsive, however it *can* get the work done
    - This project is really mean't to be viewed on desktop, because mobile design is horrendus :p

## A list of thingies (add more if it can be improved)
- [x] Panes
    - [x] Left pane has the primary name listed
    - [x] Right pane shows the data
- [x] Movement
    - `j/k` or `up/down arrows` for movement
- [x] Search (`/`)
    - [x] Advanced search with parameters
- [x] Specifications
    - [x] `Size:` lxbxh (not always accurate)
    - [x] `Etymology` or origin of names of the thingy (usually accurate)
- [x] Images
    - Should be visible by taking the primary id and searching in the `assets/png/` folder
- [x] STL viewer
    - STL files present in `assets/stl/` are linked to their respective primary ID's
    - Open in a new page
    - User can rotate and zoom in/out
- [x] A workable mobile system
    - [ ] Actually properly working search