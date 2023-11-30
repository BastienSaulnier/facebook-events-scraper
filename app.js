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

const AMSwitch = async (hour) => {
    switch(parseInt(hour)) {
        case 1:
            return "10"
        case 2:
            return "11"
        case 3:
            return "12"
        case 4:
            return "13"
        case 5:
            return "14"
        case 6:
            return "15"
        case 7:
            return "16"
        case 8:
            return "17"
        case 9:
            return "19"
        case 10:
            return "19"
        case 11:
            return "20"
        case 12:
            return "21"
        default:
            break;
    }
}

const PMSwitch = async (hour) => {
    switch(parseInt(hour)) {
        case 1:
            return "22"
        case 2:
            return "23"
        case 3:
            return "00"
        case 4:
            return "01"
        case 5:
            return "02"
        case 6:
            return "03"
        case 7:
            return "04"
        case 8:
            return "05"
        case 9:
            return "06"
        case 10:
            return "07"
        case 11:
            return "08"
        case 12:
            return "09"
        default:
            break;
    }
}

const formatBeginHour = async (dateStr) => {
    const parsedHours = dateStr.split("at ")[1].split(" UTC")[0].trim()
    const begin = parsedHours.includes(" – ") ? parsedHours.split(" – ")[0].trim() : parsedHours
    const [hour, minutes, period] = begin.split(/:| /);
    const adjustedBegin = period === 'AM' ? await AMSwitch(hour) : await PMSwitch(hour)

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

      console.log("An error occured inside component")
      return res.redirect(`/error`);
  } catch(err) {
      console.log(err)
      return res.redirect(`/error`);
  }
})

app.use('/', [home, error])


app.listen(process.env.PORT, () => console.log("Listening on ***** " + process.env.PORT + " *****"))
