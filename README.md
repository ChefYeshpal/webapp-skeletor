# webapp-skeletor
This is a project made for [Siege](https://siege.hackclub.com) by [Hackclub](https://hackclub.com). The theme for this project was ["Framework"](https://dictionary.cambridge.org/dictionary/learner-english/framework), and as such, my thinking of making this project, believing that it comes within the theme for this week's project is that: The Human bones and skeletal structure's are the **framework** to the Human body, so this project aims to describe the (major) bones and give detailed classification and information about them.

### How to use
- Use `j/k` keys or `arrow keys` to move up or down
- Use `/` to initiate search
- That's it really...

## Credits

- FMA data: [Ontobee.org](https://ontobee.org/)
- Pictures and stl models: [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) by [Kevin Mattheus Moerman](https://github.com/Kevin-Mattheus-Moerman)
- Osteometric data: [DCP2.0 from Mendeley.com](https://data.mendeley.com/datasets/6xwhzs2w38/1)
- CSV Dump of FMA: [fma-sqlite](https://github.com/mhalle/fma-sqlite) by [mhalle](https://github.com/mhalle)
- [Pebble Fischer](https://hackclub.slack.com/team/U09UTARN116) for giving me the idea of how to scrape data using python (for `python/etymology.py`)
- Etymological and Pronounciation data: [Wikitionary.org](https://en.wiktionary.org/)

### What is the FMA Ontology?
*"The Foundational Model of Anatomy Ontology (FMA) is an evolving computer-based knowledge source for biomedical informatics; it is concerned with the representation of classes or types and relationships necessary for the symbolic representation of the phenotypic structure of the human body in a form that is understandable to humans and is also navigable, parseable and interpretable by machine-based systems. Specifically, the FMA is a domain ontology that represents a coherent body of explicit declarative knowledge about human anatomy. Its ontological **framework** can be applied and extended to all other species."* [source](http://sig.biostr.washington.edu/projects/fm/AboutFM.html)

## A list of thingies
- [x] Panes
    - [x] Left pane has the primary name listed
    - [x] Right pane shows the data
- [x] Movement
    - j/k or up/down arrows for movement
- [x] Search
    - [x] Advanced search with parameters
- [ ] Specifications
    - [x] Size: lxbxh
    - [ ] Density:
    - [ ] Attached muscles:
    - [ ] Body region (e.g., head, thorax, limbs)
    - [ ] Function
    - [x] Etymology or origin of names of the thingy
- [x] Images
    - Should be visible by taking the primary id and searching in the `assets/png/` folder
- [x] STL viewer
    - STL files present in `assets/stl/` are linked to their respective primary ID's
    - Open in a new page
    - User can rotate and zoom in/out

Data should be listed as such:
- Primitive ID:
- Primitive Name:
- Composite ID:
- Composite Name:
- [Image]
- [STL view in new page]
- Specifiations
    - Size: length x breadth x height
    - Density
    - Attached Muscles (for bones)
    - Body region
    - Function
    - Etymology

### A few warnings:
- This is my first time working with json files and representating data, although I will try to make it as accurate as I can, but cracks may still slip through. If you find any discrepencies or know how to improve this project, please make a fork of [this project](https://Github.com/ChefYeshpal/webapp-skeletor), then create a pull request :)
- Images and `.stl` files might take some time to load depending on your internet connection
- This entire project is being hosted on [GitHub](https://github.com) Pages, so ofc it's uptime also depends on that.
- The specifications isn't exactly accurate
    - I honestly dont know where it kind of wen't wrong, but it'll take me a while to be able to figure out what all entries are wrong...
- The `URI` doesn't currently work because [Archive.org](https://archive.org/) is showing a 502 error code
    - Upon searching a bit about it on the internet, I saw that it's rather unstable for some reason. [Reddit](https://www.reddit.com/r/semanticweb/comments/1galfob/purl_is_down/)
    - Tho seems like this has been going on for a year now...
- Man I just can't get things properly working...
- WTF WHY ISN'T IT DEPLOYING ON GH PAGES?!?!??!?