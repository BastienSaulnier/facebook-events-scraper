require("dotenv").config()

const logger = require("morgan")
const express = require("express")
const home = require('./app/views')
const error = require('./app/views')
const {scrapeFbEvent} = require("facebook-event-scraper");
const ExcelJS = require('exceljs');

const app = express()

app.use(logger("dev"))
app.use(express.json({limit: '10mb', extended: true}))
app.use(express.urlencoded({ extended: false }));
app.use('/app/views', express.static(__dirname + '/app/views'));

app.set('views', __dirname + '/app/views');
app.set('view engine', 'ejs');

const formatBeginHour = async (timestamp) => {
    const date = new Date(timestamp);
    const timezone = 'Europe/Paris';

    const formatOptions = { timeZone: timezone, hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const formatter = new Intl.DateTimeFormat('fr-FR', formatOptions);

    const heureFormatee = formatter.format(date);

    //const localHours = date.getHours().toString().padStart(2, '0');
    //const localMinutes = date.getMinutes().toString().padStart(2, '0');

    return `${heureFormatee.split(":")[0]}:${heureFormatee.split(":")[1]}`
}

app.post("/api/scrap", async (req, res) => {
  try {
      const events = req.body.events.split("\r\n").filter(event => event !== '')
      let result = []

      for(const event of events) {
          try {
              const url = event.split("?")[0]
              const eventData = await scrapeFbEvent(url)
                  .then(data => data)
                  .catch((data) => {
                      console.log("ERREUR EVENT", data)
                      return {
                          name: null,
                          location: {
                              name: null
                          },
                          startTimestamp: null
                      }
                  })

              if(eventData) result.push({
                  title: eventData.name || "",
                  location: eventData.location?.name || "",
                  start: eventData.startTimestamp ? await formatBeginHour(parseInt(eventData.startTimestamp) * 1000) : ""
              })
          }  catch(err) {
              console.log("loop err:", err)
          }

      }

      if(result.length !== 0) {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Données');

          worksheet.columns = [
              { header: 'Titre', key: 'title', width: 50 },
              { header: 'Lieu', key: 'location', width: 50 },
              { header: 'Heure de début', key: 'start', width: 20 },
          ];

          result.forEach(item => {
              worksheet.addRow(item);
          });

          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');

          await workbook.xlsx.write(res);

          return res.end()
      }

      console.log("An error occured inside component")
      return res.redirect(`/error`);
  } catch(err) {
      console.log(err)
      return res.redirect(`/error`);
  }
})

app.use('/', [home, error])


app.listen(process.env.PORT, () => console.log("Listening on ***** " + process.env.PORT + " *****"))
