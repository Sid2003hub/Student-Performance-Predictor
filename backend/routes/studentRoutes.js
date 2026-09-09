const express = require("express");
const router = express.Router();
const { PythonShell } = require("python-shell");
const path = require("path");
const Student = require("../models/student");

router.post("/predict", async (req, res) => {

    const {
        attendance,
        studyHours,
        previousMarks,
        internalMarks,
        assignments
    } = req.body;

    const options = {
        mode: "text",
        pythonPath: "C:\\Users\\91904\\.conda\\envs\\data_science\\python.exe",
        pythonOptions: ["-u"],
        scriptPath: path.join(__dirname, "../../ml_model"),
        args: [
            attendance,
            studyHours,
            previousMarks,
            internalMarks,
            assignments
        ]
    };

    PythonShell.run("predict.py", options)
        .then(async (results) => {

            const output = results[0].split(",");

            const student = new Student({
                attendance,
                studyHours,
                previousMarks,
                internalMarks,
                assignments,
                prediction: output[0],
                confidence: parseFloat(output[1])
            });

            await student.save();

            res.json({
                prediction: output[0],
                confidence: parseFloat(output[1])
            });

        })
        .catch(err => {

            console.error(err);

            res.status(500).json({
                error: "Prediction Failed"
            });

        });

});

module.exports = router;