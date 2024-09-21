document.getElementById('infoForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 

    const webpageUrl = document.getElementById('webpageUrl').value;
    const clickedButton = event.submitter.id;
    let response;
    if (clickedButton === 'fillFormButton') {
        
        response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: webpageUrl, action: 'fillForm' })
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('companyName').value = data.extractedInfo.companyName;
            document.getElementById('typeOfProduct').value = data.extractedInfo.typeOfProduct;
            document.getElementById('idealUser').value = data.extractedInfo.idealUser;
        } else {
            console.error('Failed to fetch form data');
        }

    } else if (clickedButton === 'generateContentButton') {
        response = await fetch('/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: webpageUrl, action: 'generateContent' })
        });

        if (response.ok) {
            const data = await response.json();
            const contentContainer = document.getElementById('generatedContent');
            contentContainer.innerHTML = `<h3>Generated Content:</h3><p>${data.generatedContent}</p>`;
        } else {
            console.error('Failed to fetch generated content');
        }
    }
});
