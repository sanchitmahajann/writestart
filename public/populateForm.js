var generatedData = ""
var md = window.markdownit();

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('download').addEventListener('click', async function (event) {
        event.preventDefault();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(12);
        const element = document.getElementById("generatedContent");

        doc.html(element, {
            callback: function (doc) {
                doc.save("writestart.pdf");
            },
            x: 15,
            y: 15,
            html2canvas: {
                scale: 0.25,
            },
            autoPaging: 'text',
            width: 100,
            windowWidth: 700
        });
    })

    const goIcon = document.getElementById("go-icon");
    const loadingIcon = document.getElementById("loading-icon");
    const completedIcon = document.getElementById("completed-icon");
    
    // Hide completed and loading icons initially
    completedIcon.style.display = "none";
    loadingIcon.style.display = "none";

    document.getElementById('infoForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const webpageUrl = document.getElementById('webpageUrl').value;
        
        // Show loading icon, hide go icon
        loadingIcon.style.display = "block";
        goIcon.style.display = "none";
        completedIcon.style.display = "none";
        
        // Step 1: Fill the form data if URL is provided
        if (webpageUrl) {
            try {
                const response = await fetch('/scrape', {
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
            } catch (error) {
                console.error('Error during form data fetch:', error);
            }
        }
        
        // Step 2: Generate content with current form values
        try {
            const companyName = document.getElementById('companyName').value;
            const productName = document.getElementById('typeOfProduct').value;
            const idealUser = document.getElementById('idealUser').value;
            
            const genResponse = await fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    companyName: companyName,
                    productName: productName,
                    idealUser: idealUser,
                    action: 'generateContent'
                })
            });

            if (genResponse.ok) {
                const data = await genResponse.json();
                generatedData = data.generatedContent;
                const output = document.getElementById("generatedContent");
                output.innerHTML = md.render(generatedData.tweets);
                
                // Show completed icon, hide loading icon
                loadingIcon.style.display = "none";
                completedIcon.style.display = "block";
            } else {
                console.error('Failed to fetch generated content');
                // Show go icon if there was an error
                loadingIcon.style.display = "none";
                goIcon.style.display = "block";
            }
        } catch (error) {
            console.error('Error during content generation:', error);
            // Show go icon if there was an error
            loadingIcon.style.display = "none";
            goIcon.style.display = "block";
        }
    });

    document.getElementById('twitter').addEventListener('click', async function (event) {
        event.preventDefault();
        const output = document.getElementById("generatedContent");
        output.innerHTML = md.render(generatedData.tweets);
    });

    document.getElementById('blog').addEventListener('click', async function (event) {
        event.preventDefault();
        const output = document.getElementById("generatedContent");
        output.innerHTML = md.render(generatedData.blogs);
    });

    document.getElementById('instagram').addEventListener('click', async function (event) {
        event.preventDefault();
        const output = document.getElementById("generatedContent");
        output.innerHTML = md.render(generatedData.posts);
    });

});