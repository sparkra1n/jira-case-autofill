/*
 * File    : contentScript.js
 * Date    : 11/22/2022
 * Author  : Ani
 */

const serialNumberToField = (serialNumber) => {
  serialNumber = serialNumber.toString().toUpperCase();
  let model = "";
  let possibleRefurb = false;
  let manufacturingDate = "";
  let batch = "";
  switch (serialNumber.substring(0, 5)) {
    case "01011":
      model = "SPS-01-011, NEMA 10-30/10-30 / 24 Amp";
      break;
    case "B1011":
      model = "SPS-C1-011, NEMA 10-30/10-30 / 24 Amp";
      break;
    case "01031":
      model = "SPS-01-031, NEMA 10-30/14-50 / 24 Amp";
      break;
    case "B1031":
      model = "SPS-01-031-01(black), NEMA 10-30/14-50 / 24 Amp";
      break;
    case "02022":
      model = "SPS-02-022, NEMA 14-30/14-30 / 24 Amp";
      break;
    case "B2022":
      model = "SPS-C2-022, NEMA 14-30/14-30 / 24 Amp";
      break;
    case "02032":
      model = "SPS-02-032, NEMA 14-30/14-50 / 24 Amp";
      break;
    case "B2032":
      model = "SPS-C2-032, NEMA 14-30/14-50 / 24 Amp";
      break;
  }

  manufacturingDate = serialNumber.substring(5, 9);
  batch = serialNumber.substring(9, 13);

  if (batch.includes("R")) possibleRefurb = true;
  return {
    serialNumber: serialNumber,
    model: model,
    manufacturingDate: manufacturingDate,
    batch: batch,
    possibleRefurb: possibleRefurb
  };
};

const getParents = (element) => {
  let parents = [];
  while (element.parentNode && element.parentNode.nodeName.toLowerCase() != "body") {
    element = element.parentNode;
    parents.push(element);
  }
  return parents;
};

const getParentContainerIdFromLabel = (labelText) => {
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    if (label.innerHTML === labelText) {
      const parents = getParents(label);
      return parents[1].id;
    }
  }
};

const fillSmallField = (smallFieldLabel, text, exactMatch = true) => {
  // Find small field container based on its label and get its id
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    if ((exactMatch && label.innerHTML === smallFieldLabel) || (!exactMatch && label.innerHTML.includes(smallFieldLabel))) {
      const parents = getParents(label);

      // Go up and get the container's id
      const smallFieldInput = document.querySelector(`#${parents[1].id} input`);
      smallFieldInput.value = text;
      smallFieldInput.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );
      break;
    }
  }
};

const fillLargeField = (largeFieldLabelId, text) => {
  const descriptionContainer = document.querySelector(largeFieldLabelId);
  //TODO: Upgrade fillLargeField
};

const fillDate = (dateLabel, date, exactMatch = true) => {
  let containerId = "";
  const month = date.substring(0, 2);
  const year = date.substring(2, 4);

  // Find date container based on its label and get its id
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    if ((exactMatch && label.innerHTML === dateLabel) || (!exactMatch && label.innerHTML.includes(dateLabel))) {
      const parents = getParents(label);
      containerId = parents[1].id;
      break;
    }
  }

  // Use the id to then trigger the input in order to display the date picker
  const inputs = document.querySelectorAll(`#${containerId} input`);
  for (const input of inputs) {
    if (input.id && input.id.includes("react-select")) {
      const reactSelectInput = document.getElementById(input.id);
      reactSelectInput.value = `${month}/1/20${year}`;
      reactSelectInput.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );
      break;
    }
  }

  // Click the button corresponding to the first day of the month
  const buttons = document.querySelectorAll(`#${containerId} button`);
  for (const button of buttons) {
    if (button.innerHTML === "1") button.click();
  }
};

const fillDropDownMenu = (dropDownLabel, selectionPath, exactMatch = true) => {
  // Selection path would look something like this: ["Category", "Subcategory", "Product"]
  // Find dropdown menu based on its label and get its id
  // Use the id to then trigger the input in order to display the dropdown menu

  let containerId = "";
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    if (
      (exactMatch && label.innerHTML === dropDownLabel) ||
      (!exactMatch && label.innerHTML.includes(dropDownLabel))
    ) {
      const parents = getParents(label);
      containerId = parents[1].id;
      break;
    }
  }

  for (const step of selectionPath) {
    const inputs = document.querySelectorAll(`#${containerId} input`);

    // Get the furthest react-select id
    let reactSelectInputId;
    for (const input of inputs) {
      if (input.id && input.id.includes("react-select")) reactSelectInputId = input.id;
    }

    // Pop up the furthest menu
    const reactSelectInput = document.getElementById(reactSelectInputId);
    reactSelectInput.value = step;
    reactSelectInput.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );

    // Pick the selected option
    const options = document.querySelectorAll(`#${containerId} div`);
    for (const option of options) {
      if (option.id && option.id.includes("react-select") && option.innerHTML === step)
        option.click();
    }
  }
};

/**
 * @param {labelsToSearch} title of the fields to search
 * @returns null - not found
 * @returns string - serial number
 */
const detectSerialNumber = (fieldLabel, exactMatch = true) => {
  // Determine contents of the fields given in parameters
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    if ((exactMatch && label.innerHTML === fieldLabel) || (!exactMatch && label.innerHTML.includes(fieldLabel))) {
      const parents = getParents(label);

      // Go up and get the container's id
      const smallFieldInput = document.querySelector(`#${parents[1].id} input`);
      const matches = smallFieldInput.value.match(
        /([B]|[0])([1-2])([0])([1-3])([1-3])([0-1])([0-9])([0-9])([0-9])([0-9]|[R])([0-9])([0-9])([0-9])/gi
      );

      if (matches)
        return matches[0];
    }
  }
  return null;
};

(() => {
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { action } = obj;
    if (action === "FILL") {
      const detectedSerialNumber = detectSerialNumber("Summary", false);
      console.log(detectedSerialNumber);
      if (detectedSerialNumber) {
        const properties = serialNumberToField(detectedSerialNumber);
        fillSmallField("Serial Number", properties.serialNumber, (exactMatch = false));
        fillDropDownMenu("Product / Model", ["Splitter Switch", properties.model], exactMatch = false);
        fillDate("Manufacturing Date", properties.manufacturingDate, (exactMatch = false));
      }
    }
  });
})();
