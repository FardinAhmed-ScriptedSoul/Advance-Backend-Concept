const sendEmail = async (email) => {
  console.log(`Sending email to ${email}...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(`Email sent to ${email}`);
};

export default sendEmail;