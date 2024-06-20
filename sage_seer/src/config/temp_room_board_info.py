# singleton_config.py
class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
            # Initialize default configuration
            cls._instance.room_id = "d6640933-7b9f-4536-a263-02a514ff092a"
            cls._instance.board_id = "02fc98df-b4f1-470c-8516-7221c3095de7"
        return cls._instance

config = Config()
