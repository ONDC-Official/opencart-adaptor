import axios from "axios";

export default async function onIssueStatusHandler(req, res) {
  console.log("on Issue Status Handler handler executed");

  try {
    const return_id = req.body?.message?.issue?.id;
    const formData = new FormData();

    formData.append("return_id", return_id);

    const response = await axios.post(
      `${process.env.OPENCART_SITE}/index.php?route=api/allproducts/getReturnStatus`,
      formData,
    );

    const return_status = response.data.return_status;
    console.log("Login success. return_status:", return_status);

    res.status(200).json({ success: true, data: response.data });
    
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the search request" });
  }

}
