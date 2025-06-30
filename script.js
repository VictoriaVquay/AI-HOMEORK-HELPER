document.getElementById('homework-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const question = document.getElementById('question-input').value;
  const photo = document.getElementById('photo-input').files[0];
  const responseDiv = document.getElementById('ai-response');

  if (question || photo) {
    responseDiv.textContent = "Thinking...";
    const formData = new FormData();
    formData.append('question', question);
    if (photo) formData.append('photo', photo);

    try {
      const res = await fetch('http://localhost:3000/ask', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      responseDiv.textContent = data.answer || "Sorry, I couldn't get an answer.";
    } catch {
      responseDiv.textContent = "Error connecting to AI service.";
    }
  } else {
    responseDiv.textContent = "Please enter a question or upload a photo.";
  }
});

const form = document.getElementById('homework-form');
const paymentStatus = document.getElementById('payment-status');

function unlockForm() {
  form.style.pointerEvents = 'auto';
  form.style.opacity = '1';
  paymentStatus.textContent = "Payment successful! You can now ask your question.";
}

document.getElementById('pay-mpesa').onclick = async function() {
  const phone = prompt("Enter your M-Pesa phone number (format: 2547XXXXXXXX):");
  if (!phone) return;
  paymentStatus.textContent = "Processing M-Pesa payment...";

  try {
    const res = await fetch('http://localhost:3000/pay-mpesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount: 10 })
    });
    const data = await res.json();
    if (data.ResponseCode === "0") {
      paymentStatus.textContent = "Payment request sent! Complete payment on your phone.";
      // Optionally, poll your backend for payment confirmation before unlocking the form
      setTimeout(unlockForm, 5000); 
    } else {
      paymentStatus.textContent = "Payment initiation failed. Try again.";
    }
  } catch {
    paymentStatus.textContent = "Error connecting to payment service.";
  }
};

document.getElementById('pay-paypal').onclick = function() {
  paymentStatus.textContent = "Processing PayPal payment...";
  setTimeout(unlockForm, 2000);
};

document.getElementById('pay-airtel').onclick = function() {
  paymentStatus.textContent = "Processing Airtel Money payment...";
  setTimeout(unlockForm, 2000);
};