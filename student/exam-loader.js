// exam-loader.js
// Sole responsibility: load exam data from URL + fetch JSON

export function loadExamFromURL(onSuccess, onError) {
    const params = new URLSearchParams(window.location.search);
    const examFile = params.get("exam");

    if (!examFile) {
        onError("No exam specified in URL.");
        return;
    }

    const examPath = `../exams/${examFile}`;

    fetch(examPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch exam file: ${examPath}`);
            }
            return response.json();
        })
        .then(examData => {
            onSuccess(examData);
        })
        .catch(err => {
            console.error(err);
            onError("Unable to load exam file.");
        });
}
