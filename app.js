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

const formatBeginHour = async (dateStr) => {
    const parsedHours = dateStr.split("at ")[1].split(" UTC")[0].trim()
    const begin = parsedHours.includes(" – ") ? parsedHours.split(" – ")[0].trim() : parsedHours
    const [hour, minutes, period] = begin.split(/:| /);
    const adjustedBegin = period === 'AM' ? parseInt(hour, 10) + 12 - 3 : parseInt(hour, 10) - 3;

    return adjustedBegin + ":" + minutes
}

app.post("/api/scrap", async (req, res) => {
  try {
      const events = req.body.events.split("\r\n").filter(event => event !== '')
      let result = []

      for(const event of events) {
          const url = event.split("?")[0]

          const eventData = await scrapeFbEvent(url)

          if(eventData) result.push({
              title: eventData.name || "",
              location: eventData.location?.name || "",
              start: await formatBeginHour(eventData.formattedDate) || ""
          })
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

      return res.redirect(`/error`);
  } catch(err) {
      return res.redirect(`/error`);
  }
})

app.use('/', [home, error])


app.listen(process.env.PORT, () => console.log("Listening on ***** " + process.env.PORT + " *****"))
