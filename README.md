# Season Patterns

## [Live Demo](https://season-patterns.herokuapp.com/)

## Getting Started
1. Make sure you have **Node.js** and **Yarn** installed and a **Postgres DBMS** running on th default port
2. Run **setup.sh** and type the default password if prompted *(This script will create the a3db and tables, import the data and install Yarn dependencies)* 
3. Run **yarn start** *(This will deploy the web server and listen on port 8080)*
4. On your local browser, navigate to [https://localhost:8080/](https://localhost:8080/)

## About the Visualization
Season Patterns maps seasonal temperature changes across different time periods and geographical areas. Its primary feature is a simple line chart where the x-axis represents the time of the year and the y-axis the average temperature at that time. 

For illustrating the time component, there are two lines, each representing aggregate data for a specified range in years. The user can control both ranges through a slider and the visualization is dynamically updated. The user can also select a state or collection of states and the visualization will change to reflect the selection.

To aid the user in interpreting seasonal shifts, in addition to the line chart, the visualization also contains colored season "bands" overlaid on the x-axis. The start and end of each band represent the start and end of spring and fall for the matching color period.

As a supplement for the main visualization, the page also offers dynamic tables with relevant data such as temperature at the start and end of the season and shift count in days.

## Methodology and Data Source
This visualization uses a large dataset of over 85,000 weather stations obtained from the [NOAA 1981-2010 Climate Normals](https://www.ncdc.noaa.gov/data-access/land-based-station-data/land-based-datasets/climate-normals/1981-2010-normals-data) page. For performance, the minimum and maximum daily temperatures were converted into daily averages and aggregated by U.S. state.

To find the seasonal shift, a 9-day average temperature is calculated for the meteorological season start/end for period 1 (yellow). Then, we search for a similar 9-day average (higher or lower, depending on the season) on period 2 (red), from the middle of the previous season to the middle of the next one. Once this day is found, we mark it as the new start/end for that season.

## Design Decisions

### Data Wrangling and Aggregation
Due to the large number of rows generated by the raw data (~200 million), some aggregation was necessary. Aggregating by state made the most sense because multiple states could easily be combined into climate regions or visualized separately.

### Visualization
#### Encoding
When designing the line chart, a scatter plot was also considered, but aggregating the daily values into a a line chart seemed to be the most effective approach, primarily because the goal of the visualization was to compare two periods, not different temperatures on the same day. An area chart was also considered, but quickly discarded as it would resemble a curve-difference chart which is described by Cleveland & McGill as infective for comparing curves.

For the "color band" component of the visualization, the main focus was on the season start and end overlaps by using the x-position and length encodings. I initially considered turning the bands into big areas as tall as the entire chart, but upon implementing it I felt overlapping the areas with the lines make the chart space too crowded.  

#### Interaction
When determining which interactions to implement, time and location were the two independent variables that seemed to influence the temperature the most, which is why they were selected. The slider input made sense for the time variable because it allowed the user to easily and intuitively either slide the period while keeping the year range fixed, or slide each end-point individually. 

For the geography, states and climate regions mapped well to the aggregate values for each row on the database. A regions and/or state drop-down input was considered, but the excessive number of states made it too cumbersome to select. Additionally, individual buttons provide additional interaction possibilities such as hover events (e.g. highlight the area on a map when the user hovers over the button). For those reasons, individual geography buttons were selected over drop-down buttons.

### Back-end
When designing the backend, **Postgres SQL** and **Node.js** were chosen for efficiency and simplicity. A RESTful API supported by **Express.js** was used to manage client requests and deliver data to the front-end application. Due to the reduced number of routes (4), all server-side code was placed in a single file *(index.js)*. **Node-Postgres** was selected to facilitate the communication between the DBMS server and the web-server middleware primarily due to being a well-documented database driver. 

## Additional Features
In addition to all the features described above, two additional features of this web-application are worth mentioning. First, the ability to change visualization settings such as temperature units (Fahrenheit vs. Celsius) and level of aggregation (monthly vs. daily) can be considered a third interaction as it gives the user greater flexibility to further customize the visualization output. Second, all user interactions and changes to the visualization are instantly recorded in the website URL, allowing the user to undo, redo, bookmark and link to any visualization of his choosing. This feature provides a great deal of provenance and makes it easier to log and study user interactions for future improvement of the interface.

## Development Process
Overall the entire development process took roughly three weeks. The first week was solely dedicated to data collection and wrangling. Due to how complex and unintuitive it is to obtain and interpret the weather data provided by NOAA, this process took a substantially longer than anticipated. The size of the data set was also an issue. After writing multiple scripts to convert the data from .dly text files to .csv file in **Node.js**, JavaScript proved too slow and inefficient to handle all 200 million rows of data, so I rewrote the same script in Java, which quickly produced 10 .csv files with 20 million records each. After ingesting all those records in Postgres, I aggregated the stations by U.S. state, which reduced the number of records to roughtly 2 million.

Implementation of the middleware server was trivial, so most of the development time on the second and third weeks were spent building and refining the front-end application. I would estimate 10-15 hours were spent on data collection/wrangling and 30-35 hours were spent designing and implementing the front-end. A total of 40-50 hours were spent developing the application.