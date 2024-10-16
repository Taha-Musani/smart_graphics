require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
require("./db/conn");
const session = require("express-session");
const passport = require("passport");
const { google } = require("googleapis");
const OAuth2Strategy = require("passport-google-oauth2").Strategy;
const cookieParser = require("cookie-parser");
const userdb = require("./model/userSchema");

const clientID=process.env.CLIENT_ID
const clientSecret=process.env.CLIENT_SECRET

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json());

// setup session
app.use(
  session({
    secret: "YOUR SECRET KEY",
    resave: false,
    saveUninitialized: true,
  })
);

// setuppassport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new OAuth2Strategy(
    {
      clientID:
        clientID,
      clientSecret: clientSecret,
      callbackURL: process.env.REDIRECT_URL,
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
        "profile",
        "email",
      ],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await userdb.findOne({ googleId: profile.id });

        if (user) {
          user.accessToken = accessToken;
          await user.save();
        }

        if (!user) {
          user = new userdb({
            accessToken: accessToken,
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
          });

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// initial google ouath login
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
      "profile",
      "email",
    ],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: `${process.env.FRONTEND_URL}/dashboard`,
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  })
);

app.get("/login/sucess", async (req, res) => {
  if (req.user) {
    res.cookie("accessToken", req.user.accessToken, {
      httpOnly: true, // Helps mitigate XSS
      secure: "production", // Use secure cookies in production
      maxAge: 60 * 60 * 1000, // 1 hour (adjust as needed)
    });

    const accessToken = req.user.accessToken;
    const { OAuth2 } = google.auth;
    const oAuth2Client = new OAuth2(
      clientID,
      clientSecret
    );
    oAuth2Client.setCredentials({ access_token: accessToken });
    // console.log(accessToken);

    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const searchResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: "files(id, name)",
    });

    const files = searchResponse.data.files;
    // console.log(files);

    res
      .status(200)
      .json({ message: "user Login", user: req.user, files: files });
  } else {
    res.status(400).json({ message: "Not Authorized" });
  }
});

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect(`${process.env.FRONTEND_URL}`);
  });
});

app.post("/append-spreadsheet", async (req, res) => {
  try {
    const { advfileName, Data } = req.body;
    const accessToken = req.cookies.accessToken;

    // console.log(req.cookies.accessToken);

    const { OAuth2 } = google.auth;
    const oAuth2Client = new OAuth2(
      clientID,
      clientSecret
    );
    oAuth2Client.setCredentials({ access_token: accessToken });

    if (!advfileName || !Data) {
      return res.status(400).send("File name and data are required");
    }

    // Get the spreadsheet ID by file name using Google Drive API
    // , auth: oAuth2Client
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    const response = await drive.files.list({
      q: `name='${advfileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id, name)",
    });

    const files = response.data.files;
    if (files.length === 0) {
      return res.status(404).send("Spreadsheet not found");
    }

    const spreadsheetId = files[0].id;

    // Get the last row with data
    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });
    const getRangeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: "Sheet1", // Assuming you're using 'Sheet1', modify if necessary
    });

    const numRows = getRangeResponse.data.values
      ? getRangeResponse.data.values.length
      : 0;
    const startRow = numRows + 1; // Start appending from the next available row

    // Append new data to the spreadsheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `Sheet1!A${startRow}`, // Start appending at the correct row
      valueInputOption: "RAW",
      resource: {
        values: [
          [
            Data.fileName,
            Data.numPages,
            Data.rupeesPerPage,
            Data.date,
            Data.totalamount,
          ],
        ],
      },
    });

    res
      .status(200)
      .json({
        message: `Data appended successfully to spreadsheet "${advfileName}"`,
      })
  } catch (error) {
    // console.error("Error appending to spreadsheet:", error);
    res
      .status(500)
      .json({
        message: `An error occurred while appending data to the spreadsheet`,
      })
  }
});

app.post("/create-spreadsheet/:fileName", async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    const fileName = req.params.fileName; // Correct way
    // console.log(fileName);
    // console.log(accessToken);

    const { OAuth2 } = google.auth;
    const oAuth2Client = new OAuth2(
      clientID,
      clientSecret
    );
    oAuth2Client.setCredentials({ access_token: accessToken });

    if (!fileName) {
      return res.status(400).send("File name is required");
    }

    const drive = google.drive({ version: "v3", auth: oAuth2Client });
    const sheets = google.sheets({ version: "v4", auth: oAuth2Client });

    const searchResponse = await drive.files.list({
      q: `name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id, name)",
    });

    const files = searchResponse.data.files;

    // If a file with the same name exists, return a message
    if (files.length > 0) {
      return res.status(409).json({
        message: `A file with the name "${fileName}" already exists.`,
        fileId: files[0].id,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${files[0].id}`,
      });
    }

    const fileMetadata = {
      name: fileName,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };

    // Create the new spreadsheet
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: "id",
    });

    const spreadsheetId = file.data.id;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${file.data.id}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: "Sheet1!A1", // Assuming header starts in the first row, first column
      valueInputOption: "RAW",
      resource: {
        values: [
          ["File Name", "Price per page", "Number of Pages", "Date", "Total"],
        ], // The header data should be a single row array
      },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0, // Assuming the default sheet (Sheet1)
                startRowIndex: 0, // First row (index 0)
                endRowIndex: 1, // Only the first row
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true, // Apply bold formatting
                  },
                },
              },
              fields: "userEnteredFormat.textFormat.bold", // Only apply bold formatting
            },
          },
        ],
      },
    });

    res.status(200).json({
      message: `Spreadsheet "${fileName}" created successfully`,
      spreadsheetUrl: spreadsheetUrl,
    });
  } catch (error) {
    // console.error("Error creating spreadsheet:", error);
    res.status(500).send("An error occurred while creating the spreadsheet");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`server start at port no ${process.env.PORT}`);
});

