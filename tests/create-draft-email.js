const grantId = "cc895930-3382-4e47-9b84-1b3b84d85798";
const NylasClient = require("../src/Nylas");
const _ = require("../src/Helpers");
const fs = require("fs");
const path = require("path");

const createDraftEmail = async () => {
    const nylas = new NylasClient({ grantId });

    // 1. List the image files you want to embed
    const imageFiles = ["belleza-way-fort-myers.jpg", "del-prado.png", "6-mile-crpress-prkway.jpg"];

    const images = imageFiles.map((filename) => {
        const filePath = path.join(__dirname, "../images", filename);

        // 2. Read the file, encode to Base64
        const raw = fs.readFileSync(filePath);
        const base64 = raw.toString("base64");

        // 3. Create a clean alphanumeric CID
        //    (strip out spaces, dots, hyphens – whatever you like)
        const contentId = filename.replace(/[^a-zA-Z0-9]/g, "");

        // 4. Pick the correct mime‑type
        const ext = path.extname(filename).slice(1); // "jpg" or "png"
        const mime = ext === "png" ? "image/png" : "image/jpeg";

        return {
            content_type: `${mime}; name="${filename}"`,
            filename,
            content: base64,
            content_id: contentId,
        };
    });

    // 5. Build your HTML body by replacing {{image}} placeholders
    //    with <img src="cid:...">
    let htmlBody = `Hi {{first_name}},

Per our LinkedIn conversation, I wanted to send some more info on what we do in case you need roofing help.

We are a Roofing contractor, fully licensed and insured with workers comp. My team has been roofing in Florida for over 20 years and we are extremely passionate about what we do.

We build TPO, Tile, Shingle, Metal (5v + standing seam), and Modified roof systems. We have unmarked trucks and trailers as well as bi-lingal project managers for every project.

Below, I have provided a link to our website's project page as well as some references and photos of projects I completed in South FL over the last few weeks. 

<a href="https://www.ogroof.com/project">https://www.ogroof.com/project</a>

List of References:

1. American Building Contractors
Josh Kestner: 239-777-0459
<a href="mailto:josh.kestner@abc-usa.com">josh.kestner@abc-usa.com</a>

2. Blusky Restoration
Zac Whittle: 502-655-9044
<a href="mailto:zac.whittle@goblusky.com">zac.whittle@goblusky.com</a>

3. Double G Construction
Bob Palmiere: 561-376-8495
<a href="mailto:bob@doublegconstruction.com">bob@doublegconstruction.com</a>

4. ATI Restoration
John Clabeaux: 480-688-7603
<a href="mailto:clabeaux.jj@gmail.com">clabeaux.jj@gmail.com</a>

5. Kris Konstruction
Mike Shifter: 813-376-6268
<a href="mailto:mschifter@kriskonstruction.com">mschifter@kriskonstruction.com</a>

{{image}}
4,000 SQ TILE Remove and Replace
9270 Belleza Way Fort Myers, FL 33908

{{image}}
330 SQ Remove modified insall Firestone TPO
4519 Del Prado Blvd S Cape Coral, FL 33904

{{image}}
330SQ Flute Filled Rhinobond TPO Roof System installed over Standing seam
14601 6 Mile Cypress Pkwy Fort Myers, FL 33912

Sophia Ochoa 

Account Manager 
Ocean Construction Group 
CGC 1504639 
CCC 1332364 
(786) 696-4829
<a href="https://www.ogroof.com">OGroof.com</a>
    `;

    imageFiles.forEach((filename, idx) => {
        const cid = images[idx].content_id;
        // Replace only the next occurrence of {{image}}
        htmlBody = htmlBody.replace(
            "{{image}}",
            `<img src="cid:${cid}" alt="Project photo ${idx + 1}" />`
        );
    });

    // 6. Convert newlines to <br> (if you want) or just pass htmlBody straight into Nylas
    const body = _.convertNewlinesToHtml(htmlBody);

    // Read the PDF file, encode to Base64, and prepare non-inline attachment
    const pdfPath = path.join(__dirname, "../Ocean Group Construction - Marketing PDF.pdf");
    const pdfRaw = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfRaw.toString("base64");
    const pdfAttachment = {
        content_type: 'application/pdf; name="Ocean Group Construction - Marketing PDF.pdf"',
        filename: "Ocean Group Construction - Marketing PDF.pdf",
        content: pdfBase64,
    };

    // 7. Assemble the payload and send
    const emailData = {
        subject: "Auto drafted email with inline pics",
        to: [{ email: "ryan@peakleads.io" }],
        body,
        attachments: [...images, pdfAttachment],
    };

    try {
        // Create the draft
        const draft = await nylas.createDraft(emailData);
        console.log("Draft created successfully:", draft.data.id);

        console.log(`draft -->`, draft);
    } catch (error) {
        console.error("Error in createAndSendDraft:", error.message);
        console.error(error);
    }
};

createDraftEmail();
