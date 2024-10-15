def getModelsInfo(ps3):
    sage3_config = ps3.s3_comm.web_config
    openai = sage3_config["openai"]
    llama = sage3_config["llama"]
    return {"llama": llama, "openai": openai}
