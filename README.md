# webapp-skeletor
This is a project made for [Siege](https://siege.hackclub.com) by [Hackclub](https://hackclub.com). The theme for this project was ["Framework"](https://dictionary.cambridge.org/dictionary/learner-english/framework), and as such, my thinking of making this project, believing that it comes within the theme for this week's project is that: The Human bones and skeletal structure's are the **framework** to the Human body, so this project aims to describe the (major) bones and give detailed classification and information about them.

## Credits
- Skeleton Model: [Artec3d](https://www.artec3d.com/3d-models/human-skeleton-hd)
- FMA data: [Ontobee.org](https://ontobee.org/)
- Pictures and stl models: [BodyParts3D](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D)
- Osteometric data: [DCP2.0 from Mendeley.com](https://data.mendeley.com/datasets/6xwhzs2w38/1)

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
    - [ ] Etymology or origin of names of the thingy
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
    - Etumology

### A few warnings:
- Muscles dont really work properly when you zoom in to view the stl viewer
    - They just dissapear
    - I wasn't able to find a fix for this yet...
- Images and `.stl` files might take some time to load depending on your internet connection
- This entire project is being hosted on [GitHub](https://github.com) Pages, so ofc it's uptime also depends on that.