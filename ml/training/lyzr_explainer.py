import os
from dotenv import load_dotenv
from lyzr import Studio

load_dotenv()

studio = Studio(api_key=os.getenv("LYZR_API_KEY"))

explainer_agent = studio.create_agent(
    name="VOLT Prediction Explainer",
    provider="openai/gpt-4o",
    role="EV charging assistant",
    goal="Explain a charging station prediction in one friendly sentence for a driver",
    instructions="Given availability probability, wait time, reliability, and confidence, write ONE short, friendly sentence a driver would understand. No jargon."
)

def explain_prediction(prediction: dict) -> str:
    prompt = (
        f"Station {prediction['stationId']}: "
        f"{prediction['availabilityProbability']*100:.0f}% chance available, "
        f"expected wait {prediction['expectedWaitMinutes']} minutes, "
        f"reliability {prediction['reliabilityScore']*100:.0f}%, "
        f"confidence {prediction['confidence']*100:.0f}%."
    )
    response = explainer_agent.run(prompt)
    return response.response

if __name__ == "__main__":
    sample_prediction = {
        "stationId": "103606",
        "availabilityProbability": 0.523,
        "expectedWaitMinutes": 11.5,
        "reliabilityScore": 0.872,
        "confidence": 0.922,
    }
    print(explain_prediction(sample_prediction))