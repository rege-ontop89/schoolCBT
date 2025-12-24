/**
 * SchoolCBT Google Sheets Integration
 * Handlers POST requests from the client-side exam interface.
 */

const SHEET_NAME = 'ExamResults';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10 seconds for other requests to finish

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = doc.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = doc.insertSheet(SHEET_NAME);
      // Add headers if new
      sheet.appendRow([
        'Submission ID', 'Timestamp', 'Student Name', 'Reg Number', 'Class',
        'Exam ID', 'Subject', 'Term', 'Total Marks', 'Obtained Marks',
        'Percentage', 'Passed', 'Duration Used', 'Violations', 'Client Time', 'Full JSON'
      ]);
    }

    const data = JSON.parse(e.postData.contents);
    
    // Basic validation based on schema presence
    if (!data.submissionId || !data.student || !data.scoring) {
      throw new Error("Invalid payload: Missing required fields");
    }

    // Map JSON to columns (Order must match the headers in SHEETS_INTEGRATION.md)
    const row = [
      data.submissionId,
      new Date(), // Server Timestamp
      data.student.fullName,
      data.student.registrationNumber,
      data.student.class,
      data.exam.examId,
      data.exam.subject,
      data.exam.term,
      data.scoring.totalMarks,
      data.scoring.obtainedMarks,
      data.scoring.percentage,
      data.scoring.passed,
      data.timing.durationUsed,
      data.integrity ? data.integrity.violations : 0,
      data.submission.clientTimestamp,
      JSON.stringify(data) // Backup of full data
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': sheet.getLastRow() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// OPTIONS method handling for CORS preflight (sometimes needed depending on browser/GAS handling)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
