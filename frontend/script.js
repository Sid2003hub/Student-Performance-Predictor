// Prediction Form

const predictionForm = document.getElementById("predictionForm");

if (predictionForm) {

    predictionForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const studentData = {

            attendance: Number(document.getElementById("attendance").value),

            studyHours: Number(document.getElementById("studyHours").value),

            previousMarks: Number(document.getElementById("previousMarks").value),

            internalMarks: Number(document.getElementById("internalMarks").value),

            assignments: Number(document.getElementById("assignments").value)

        };

        try {

            const response = await fetch("http://localhost:5000/api/student/predict", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(studentData)

            });

            const result = await response.json();

           console.log(result);

           localStorage.setItem("prediction",result.prediction);
           localStorage.setItem("confidence",result.confidence);

           window.location.href = "result.html";

        } catch (error) {

            console.error(error);
            alert("Prediction Failed!");

        }

    });

}