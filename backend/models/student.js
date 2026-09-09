const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  attendance: Number,
  studyHours: Number,
  previousMarks: Number,
  internalMarks: Number,
  assignments: Number,

  prediction: String,
  confidence: Number,

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Student", studentSchema);